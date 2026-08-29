/**
 * Deliberately duplicated from src/lib/utils.ts, not imported from it.
 * That file also pulls in date-fns and zod for its other exports, and
 * esbuild can't tree-shake those out (measured: importing just these 6
 * functions from it bundled to 300+KB). This embeddable widget ships to
 * arbitrary third-party websites, so a handful of copied one-liners is a
 * better trade than a 300KB script tag. Keep these in sync with utils.ts
 * if the formatting logic there ever changes.
 */

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Formats a booking-availability "HH:mm" 24-hour slot value for display as 12-hour, e.g. "14:00" -> "2:00 PM". */
export function formatSlotLabel(slot: string): string {
  const [hh, mm] = slot.split(":").map(Number);
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${period}`;
}

/** Format a US phone string as 802-258-0000 or +1-802-258-0000 while the user types. */
export function formatPhone(raw: string): string {
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasPlus || digits.length > 10) {
    const cc = digits.slice(0, digits.length - 10);
    const area = digits.slice(-10, -7);
    const mid = digits.slice(-7, -4);
    const last = digits.slice(-4);
    if (digits.length <= 1) return hasPlus ? `+${digits}` : digits;
    if (digits.length <= 4) return `+${cc}-${area}`;
    if (digits.length <= 7) return `+${cc}-${area}-${mid}`;
    return `+${cc}-${area}-${mid}-${last}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Strip a formatted phone to digits-only (with optional leading +). For storage / validation. */
export function stripPhone(formatted: string): string {
  const hasPlus = formatted.startsWith("+");
  const digits = formatted.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/** Auto-capitalize first letter of each word (for names). */
export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
