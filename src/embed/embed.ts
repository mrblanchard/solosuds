/**
 * SoloSuds embeddable booking widget.
 *
 * Ships as a single self-contained script (built by scripts/build-embed.mjs
 * into public/embed.js). A customer pastes:
 *
 *   <div data-solosuds-booking="their-org-slug"></div>
 *   <script src="https://solosuds.com/embed.js" async></script>
 *
 * onto their own website. This finds every such element, mounts a Shadow DOM
 * root inside it (so the widget's styles can't leak into the host page and
 * the host page's styles/reset can't leak in), and renders the same booking
 * flow as src/components/booking/public-booking-form.tsx, hand-rolled in
 * vanilla DOM instead of React to keep this script small — it has to load
 * fast on someone else's website.
 *
 * Talks to the public booking API (no auth/session, CORS-enabled — see
 * src/lib/cors.ts) at whatever origin served this script, so it works
 * unmodified on preview/staging deploys too.
 */
import cssText from "./styles.css";
import {
  formatCurrency,
  formatSlotLabel,
  formatPhone,
  stripPhone,
  titleCase,
  normalizeEmail,
  isValidEmail,
} from "./format";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  description: string | null;
}

interface OrgData {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  services: Service[];
}

interface SlotInfo {
  time: string;
  available: boolean;
}

type Step = "service" | "details" | "confirmed" | "waitlisted";

// Captured synchronously at script-load time — document.currentScript is
// only reliable during the script's initial, synchronous execution.
const SCRIPT_SRC = (document.currentScript as HTMLScriptElement | null)?.src ?? null;

function apiBaseFor(el: HTMLElement): string {
  const override = el.dataset.apiBase;
  if (override) return override.replace(/\/$/, "");
  if (SCRIPT_SRC) {
    try {
      return new URL(SCRIPT_SRC).origin;
    } catch {
      // fall through
    }
  }
  return window.location.origin;
}

function isValidHex(value: string | null | undefined): value is string {
  return !!value && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: { className?: string; text?: string; html?: never } = {},
  children: (Node | null | undefined | false)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text != null) node.textContent = opts.text;
  for (const child of children) {
    if (child) node.appendChild(child);
  }
  return node;
}

function todayLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

class BookingWidget {
  private root: ShadowRoot;
  private apiBase: string;
  private org: OrgData | null = null;
  private accent = "#4f46e5";

  // Flow state
  private step: Step = "service";
  private selectedService: Service | null = null;
  private date = "";
  private time = "";
  private firstName = "";
  private lastName = "";
  private email = "";
  private phone = "";
  private smsConsent = false;
  private notes = "";
  private submitting = false;
  private error: string | null = null;

  private slots: SlotInfo[] = [];
  private loadingSlots = false;
  private slotsError = false;
  private dayClosed = false;
  private fullyBooked = false;
  private wantsWaitlist = false;

  constructor(private host: HTMLElement, private slug: string) {
    this.apiBase = apiBaseFor(host);
    this.root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = cssText;
    this.root.appendChild(style);
    this.renderLoading();
    this.load();
  }

  private async load() {
    try {
      const res = await fetch(`${this.apiBase}/api/book/org?slug=${encodeURIComponent(this.slug)}`);
      if (!res.ok) {
        this.renderUnavailable();
        return;
      }
      this.org = await res.json();
      const override = this.host.dataset.accent;
      this.accent = isValidHex(override)
        ? override
        : isValidHex(this.org?.primaryColor)
        ? (this.org!.primaryColor as string)
        : "#4f46e5";
      this.host.style.setProperty("--ss-accent", this.accent);
      this.render();
    } catch {
      this.renderUnavailable();
    }
  }

  private clear() {
    this.root.querySelectorAll(".ss-root").forEach((n) => n.remove());
  }

  private renderLoading() {
    this.clear();
    const wrap = h("div", { className: "ss-root" }, [
      h("p", { className: "ss-loading", text: "Loading booking form…" }),
    ]);
    this.root.appendChild(wrap);
  }

  private renderUnavailable() {
    this.clear();
    const wrap = h("div", { className: "ss-root" }, [
      h("div", { className: "ss-card" }, [
        h("div", { className: "ss-card-body" }, [
          h("p", { className: "ss-alert ss-alert-info", text: "Online booking isn't available right now." }),
        ]),
      ]),
    ]);
    this.root.appendChild(wrap);
  }

  private async loadSlots() {
    if (!this.selectedService || !this.date) return;
    this.loadingSlots = true;
    this.time = "";
    this.wantsWaitlist = false;
    this.slotsError = false;
    this.dayClosed = false;
    this.render();
    try {
      const url = `${this.apiBase}/api/book/availability?orgId=${this.org!.id}&serviceId=${this.selectedService.id}&date=${this.date}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      this.slots = data.slots ?? [];
      this.fullyBooked = !!data.fullyBooked;
      this.dayClosed = data.reason === "closed";
    } catch {
      this.slots = [];
      this.fullyBooked = false;
      this.slotsError = true;
    } finally {
      this.loadingSlots = false;
      this.render();
    }
  }

  private async submitBooking() {
    if (!this.selectedService || !this.date || !this.time || !this.firstName || !this.lastName) {
      this.error = "Please fill in all required fields.";
      this.render();
      return;
    }
    if (!this.email && !this.phone) {
      this.error = "Please provide an email or phone number so we can confirm your booking.";
      this.render();
      return;
    }
    if (this.email && !isValidEmail(this.email)) {
      this.error = "Please enter a valid email address.";
      this.render();
      return;
    }
    if (this.phone && !/^[+]?[\d-]{7,20}$/.test(stripPhone(this.phone))) {
      this.error = "Please enter a valid phone number.";
      this.render();
      return;
    }
    if (!this.email && this.phone && !this.smsConsent) {
      this.error = "Since you didn't provide an email, please check the box to receive a text confirmation.";
      this.render();
      return;
    }

    this.error = null;
    this.submitting = true;
    this.render();

    try {
      const res = await fetch(`${this.apiBase}/api/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: this.org!.id,
          serviceId: this.selectedService.id,
          date: this.date,
          time: this.time,
          clientFirstName: this.firstName.trim(),
          clientLastName: this.lastName.trim(),
          clientEmail: normalizeEmail(this.email),
          clientPhone: stripPhone(this.phone),
          smsConsent: this.phone ? this.smsConsent : false,
          notes: this.notes,
        }),
      });
      if (res.ok) {
        this.step = "confirmed";
      } else {
        const json = await res.json().catch(() => ({}));
        this.error = json.error ?? "Booking failed. Please try again.";
        if (res.status === 409) this.loadSlots();
      }
    } catch {
      this.error = "Network error. Please try again.";
    } finally {
      this.submitting = false;
      this.render();
    }
  }

  private async submitWaitlist() {
    if (!this.firstName || !this.lastName) {
      this.error = "Please fill in your name.";
      this.render();
      return;
    }
    if (!this.email && !this.phone) {
      this.error = "Please provide an email or phone number so we can notify you.";
      this.render();
      return;
    }
    if (this.email && !isValidEmail(this.email)) {
      this.error = "Please enter a valid email address.";
      this.render();
      return;
    }
    if (this.phone && !/^[+]?[\d-]{7,20}$/.test(stripPhone(this.phone))) {
      this.error = "Please enter a valid phone number.";
      this.render();
      return;
    }
    if (!this.email && this.phone && !this.smsConsent) {
      this.error = "Since you didn't provide an email, please check the box to receive a text confirmation.";
      this.render();
      return;
    }
    this.error = null;
    this.submitting = true;
    this.render();
    try {
      const res = await fetch(`${this.apiBase}/api/book/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: this.org!.id,
          serviceId: this.selectedService?.id,
          firstName: this.firstName.trim(),
          lastName: this.lastName.trim(),
          email: normalizeEmail(this.email),
          phone: stripPhone(this.phone),
          smsConsent: this.phone ? this.smsConsent : false,
          preferredDate: this.date || undefined,
          notes: this.notes,
        }),
      });
      if (res.ok) {
        this.step = "waitlisted";
      } else {
        const json = await res.json().catch(() => ({}));
        this.error = json.error ?? "Something went wrong. Please try again.";
      }
    } catch {
      this.error = "Network error. Please try again.";
    } finally {
      this.submitting = false;
      this.render();
    }
  }

  private render() {
    this.clear();
    const wrap = h("div", { className: "ss-root" }, [
      this.error ? h("p", { className: "ss-alert ss-alert-error", text: this.error }) : null,
      this.step === "confirmed" ? this.renderConfirmed() : null,
      this.step === "waitlisted" ? this.renderWaitlisted() : null,
      this.step === "service" ? this.renderServiceStep() : null,
      this.step === "details" ? this.renderDetailsStep() : null,
      h("p", { className: "ss-footer", text: `Booking powered by SoloSuds · ${this.org?.name ?? ""}` }),
    ]);
    this.root.appendChild(wrap);
  }

  private renderConfirmed() {
    const willText = !!(this.phone && this.smsConsent);
    const destinations = [
      this.email ? `an email to ${this.email}` : null,
      willText ? `a text to ${this.phone}` : null,
    ].filter(Boolean);
    return h("div", { className: "ss-card" }, [
      h("div", { className: "ss-confirm" }, [
        h("p", { className: "ss-confirm-title", text: "Booking confirmed!" }),
        h("p", {
          className: "ss-confirm-text",
          text: `We'll send ${destinations.join(" and ")}. See you soon!`,
        }),
      ]),
    ]);
  }

  private renderWaitlisted() {
    const text = this.email
      ? `We'll email ${this.email} the moment a spot opens up.`
      : `We'll text ${this.phone} the moment a spot opens up.`;
    return h("div", { className: "ss-card" }, [
      h("div", { className: "ss-confirm" }, [
        h("p", { className: "ss-confirm-title", text: "You're on the waitlist!" }),
        h("p", { className: "ss-confirm-text", text }),
      ]),
    ]);
  }

  private renderServiceStep() {
    const services = this.org!.services;
    return h("div", { className: "ss-card" }, [
      h("div", { className: "ss-card-header" }, [h("p", { className: "ss-card-title", text: "Choose a Service" })]),
      h(
        "div",
        { className: "ss-card-body" },
        services.length === 0
          ? [h("p", { className: "ss-note", text: "No services available for online booking." })]
          : services.map((service) => {
              const btn = h("button", { className: "ss-service" }, [
                h("div", { className: "ss-service-row" }, [
                  h("div", {}, [
                    h("p", { className: "ss-service-name", text: service.name }),
                    service.description ? h("p", { className: "ss-service-desc", text: service.description }) : null,
                    h("p", { className: "ss-service-duration", text: `${service.durationMinutes} minutes` }),
                  ]),
                  service.price != null
                    ? h("span", { className: "ss-service-price", text: formatCurrency(service.price) })
                    : null,
                ]),
              ]);
              btn.addEventListener("click", () => {
                this.selectedService = service;
                this.step = "details";
                this.date = "";
                this.time = "";
                this.render();
              });
              return btn;
            })
      ),
    ]);
  }

  private renderDetailsStep() {
    const service = this.selectedService!;
    const backBtn = h("button", { className: "ss-back", text: "← Change service" });
    backBtn.addEventListener("click", () => {
      this.step = "service";
      this.render();
    });

    const form = h("form", {}, [
      h("div", { className: "ss-alert ss-alert-info" }, [
        document.createTextNode(`${service.name} · ${service.durationMinutes} min`),
      ]),
      this.renderDateField(),
      this.date ? this.renderTimeField() : null,
      this.renderContactFields(),
      this.phone ? this.renderConsent() : null,
      this.renderNotesField(),
      this.renderSubmitButton(),
    ]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.wantsWaitlist) this.submitWaitlist();
      else this.submitBooking();
    });

    return h("div", { className: "ss-card" }, [
      h("div", { className: "ss-card-header" }, [
        h("p", { className: "ss-card-title", text: "Your Details" }),
        backBtn,
      ]),
      h("div", { className: "ss-card-body" }, [form]),
    ]);
  }

  private renderDateField() {
    const field = h("div", { className: "ss-field" }, [
      h("label", { className: "ss-label" }, [
        document.createTextNode("Date "),
        h("span", { className: "ss-required", text: "*" }),
      ]),
    ]);
    const input = h("input", { className: "ss-input" }) as HTMLInputElement;
    input.type = "date";
    input.min = todayLocalDateString();
    input.value = this.date;
    input.required = true;
    input.addEventListener("change", () => {
      this.date = input.value;
      this.loadSlots();
    });
    field.appendChild(input);
    return field;
  }

  private renderTimeField() {
    const field = h("div", { className: "ss-field" }, [
      h("label", {
        className: "ss-label",
        text: "Time *",
      }),
    ]);

    if (this.loadingSlots) {
      field.appendChild(h("p", { className: "ss-loading", text: "Loading available times…" }));
      return field;
    }
    if (this.slotsError) {
      const retry = h("button", { className: "ss-button ss-button-outline", text: "Try again" });
      retry.type = "button";
      retry.addEventListener("click", () => this.loadSlots());
      field.appendChild(
        h("div", { className: "ss-alert ss-alert-info" }, [
          h("p", { text: "Couldn't load available times." }),
          retry,
        ])
      );
      return field;
    }
    if (this.dayClosed) {
      field.appendChild(
        h("div", { className: "ss-alert ss-alert-info", text: "Not available on this day. Please pick another date." })
      );
      return field;
    }
    if (this.fullyBooked) {
      const joinBtn = h("button", { className: "ss-button ss-button-outline", text: "Join Waitlist" });
      joinBtn.type = "button";
      joinBtn.addEventListener("click", () => {
        this.wantsWaitlist = true;
        this.render();
      });
      field.appendChild(
        h("div", { className: "ss-alert ss-alert-warn" }, [
          h("p", { text: "Fully booked that day. Want to be notified if a spot opens up?" }),
          joinBtn,
        ])
      );
      return field;
    }

    const grid = h("div", { className: "ss-slots" });
    for (const slot of this.slots) {
      const btn = h("button", { className: "ss-slot", text: formatSlotLabel(slot.time) }) as HTMLButtonElement;
      btn.type = "button";
      btn.disabled = !slot.available;
      btn.dataset.selected = String(this.time === slot.time);
      btn.addEventListener("click", () => {
        if (!slot.available) return;
        this.time = slot.time;
        this.render();
      });
      grid.appendChild(btn);
    }
    field.appendChild(grid);
    return field;
  }

  private renderContactFields() {
    const wrap = h("div", {}, [
      h("p", { className: "ss-note", text: "We need at least an email or a phone number to confirm your booking." }),
    ]);

    const row = h("div", { className: "ss-row-2" });
    row.appendChild(
      this.textField("First name", this.firstName, "text", true, {
        onInput: (v) => (this.firstName = v),
        onBlur: () => {
          this.firstName = titleCase(this.firstName.trim());
          return this.firstName;
        },
      })
    );
    row.appendChild(
      this.textField("Last name", this.lastName, "text", true, {
        onInput: (v) => (this.lastName = v),
        onBlur: () => {
          this.lastName = titleCase(this.lastName.trim());
          return this.lastName;
        },
      })
    );
    wrap.appendChild(row);

    wrap.appendChild(
      this.textField("Email", this.email, "email", !this.phone, {
        onInput: (v) => (this.email = v),
        onBlur: () => {
          this.email = normalizeEmail(this.email);
          return this.email;
        },
      })
    );

    const phoneField = h("div", { className: "ss-field" }, [
      h("label", { className: "ss-label" }, [
        document.createTextNode("Phone "),
        !this.email ? h("span", { className: "ss-required", text: "*" }) : null,
      ]),
    ]);
    const phoneInput = h("input", { className: "ss-input" }) as HTMLInputElement;
    phoneInput.type = "tel";
    phoneInput.placeholder = "802-258-0000";
    phoneInput.value = this.phone;
    phoneInput.addEventListener("input", () => {
      this.phone = formatPhone(phoneInput.value);
      if (!this.phone) this.smsConsent = false;
      // Re-render on blur only, to avoid fighting cursor position while typing;
      // but we do need the consent checkbox (and the email/phone required
      // asterisks) to update once a phone is entered or cleared.
      const shouldShowConsent = !!this.phone;
      const hasConsentBlock = !!this.root.querySelector(".ss-consent");
      if (shouldShowConsent !== hasConsentBlock) this.render();
    });
    phoneField.appendChild(phoneInput);
    wrap.appendChild(phoneField);

    return wrap;
  }

  private textField(
    label: string,
    value: string,
    type: string,
    required: boolean,
    handlers: { onInput: (v: string) => void; onBlur?: () => string }
  ) {
    const field = h("div", { className: "ss-field" }, [
      h("label", { className: "ss-label" }, [
        document.createTextNode(label + " "),
        required ? h("span", { className: "ss-required", text: "*" }) : null,
      ]),
    ]);
    const input = h("input", { className: "ss-input" }) as HTMLInputElement;
    input.type = type;
    input.value = value;
    input.required = required;
    input.addEventListener("input", () => handlers.onInput(input.value));
    if (handlers.onBlur) {
      input.addEventListener("blur", () => {
        input.value = handlers.onBlur!();
      });
    }
    field.appendChild(input);
    return field;
  }

  private renderConsent() {
    const label = h("label", { className: "ss-consent" });
    const checkbox = h("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = this.smsConsent;
    checkbox.addEventListener("change", () => {
      this.smsConsent = checkbox.checked;
    });
    label.appendChild(checkbox);
    const span = h("span", {});
    if (!this.email) {
      span.appendChild(
        h("strong", { text: "Required, since no email was provided* — " })
      );
    }
    span.appendChild(
      document.createTextNode(
        `I agree to receive appointment text messages from ${this.org?.name ?? "this business"} via SoloSuds at the number above. Msg & data rates may apply. Reply STOP to opt out.`
      )
    );
    label.appendChild(span);
    return label;
  }

  private renderNotesField() {
    const field = h("div", { className: "ss-field" }, [h("label", { className: "ss-label", text: "Notes for the practitioner" })]);
    const input = h("input", { className: "ss-input" }) as HTMLInputElement;
    input.type = "text";
    input.placeholder = "Optional";
    input.value = this.notes;
    input.addEventListener("input", () => (this.notes = input.value));
    field.appendChild(input);
    return field;
  }

  private renderSubmitButton() {
    const btn = h("button", { className: "ss-button" }) as HTMLButtonElement;
    btn.type = "submit";
    if (this.wantsWaitlist) {
      btn.textContent = this.submitting ? "Joining…" : "Join Waitlist";
      btn.disabled = this.submitting;
    } else {
      btn.textContent = this.submitting ? "Booking…" : this.time ? "Confirm Booking" : "Pick a time above";
      btn.disabled = this.submitting || !this.time;
    }
    return btn;
  }
}

function mount(el: HTMLElement) {
  if (el.dataset.ssMounted === "true") return;
  const slug = el.dataset.solosudsBooking;
  if (!slug) return;
  el.dataset.ssMounted = "true";
  new BookingWidget(el, slug);
}

function init() {
  document.querySelectorAll<HTMLElement>("[data-solosuds-booking]").forEach(mount);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
