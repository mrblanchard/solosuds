"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import Link from "next/link";
import { formatCurrency, formatSlotLabel } from "@/lib/utils";
import { formatPhone, stripPhone, titleCase, normalizeEmail } from "@/lib/utils";
import { CheckCircle, Clock } from "lucide-react";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  description: string | null;
}

interface Props {
  orgId: string;
  orgName: string;
  services: Service[];
  primaryColor?: string | null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

interface SlotInfo {
  time: string; // "HH:mm"
  available: boolean;
}

export default function PublicBookingForm({ orgId, orgName, services, primaryColor }: Props) {
  const [step, setStep] = useState<"service" | "details" | "confirm">("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [fullyBooked, setFullyBooked] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [wantsWaitlist, setWantsWaitlist] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const accent = primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor) ? primaryColor : "#4f46e5";

  const loadSlots = useCallback(async () => {
    if (!selectedService || !date) return;
    setLoadingSlots(true);
    setTime("");
    setWantsWaitlist(false);
    setSlotsError(false);
    setDayClosed(false);
    try {
      const res = await fetch(`/api/book/availability?orgId=${orgId}&serviceId=${selectedService.id}&date=${date}`);
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setSlots(data.slots ?? []);
      setFullyBooked(!!data.fullyBooked);
      setDayClosed(data.reason === "closed");
    } catch {
      setSlots([]);
      setFullyBooked(false);
      setSlotsError(true);
    } finally {
      setLoadingSlots(false);
    }
  }, [orgId, selectedService, date]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  async function submit() {
    if (!selectedService || !date || !time || !firstName || !lastName) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!email && !phone) {
      setError("Please provide an email or phone number so we can confirm your booking.");
      return;
    }
    if (firstName.length > 100 || lastName.length > 100) {
      setError("Name is too long.");
      return;
    }
    if (email && !isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone && !/^[+]?[\d-]{7,20}$/.test(stripPhone(phone))) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (!email && phone && !smsConsent) {
      setError("Since you didn't provide an email, please check the box to receive a text confirmation.");
      return;
    }
    if (notes.length > 5000) {
      setError("Notes are too long.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        serviceId: selectedService.id,
        date,
        time,
        clientFirstName: firstName.trim(),
        clientLastName: lastName.trim(),
        clientEmail: normalizeEmail(email),
        clientPhone: stripPhone(phone),
        smsConsent: phone ? smsConsent : false,
        notes,
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      setConfirmed(true);
    } else {
      const json = await res.json();
      setError(json.error ?? "Booking failed. Please try again.");
      if (res.status === 409) loadSlots();
    }
  }

  async function submitWaitlist() {
    if (!firstName || !lastName) {
      setError("Please fill in your name.");
      return;
    }
    if (!email && !phone) {
      setError("Please provide an email or phone number so we can notify you.");
      return;
    }
    if (email && !isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone && !/^[+]?[\d-]{7,20}$/.test(stripPhone(phone))) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (!email && phone && !smsConsent) {
      setError("Since you didn't provide an email, please check the box to receive a text confirmation.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/book/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        serviceId: selectedService?.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizeEmail(email),
        phone: stripPhone(phone),
        smsConsent: phone ? smsConsent : false,
        preferredDate: date || undefined,
        notes,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setWaitlistSubmitted(true);
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Something went wrong. Please try again.");
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wantsWaitlist) {
      submitWaitlist();
    } else {
      submit();
    }
  }

  if (confirmed) {
    const willText = !!(phone && smsConsent);
    const destinations = [
      email ? `an email to ${email}` : null,
      willText ? `a text to ${phone}` : null,
    ].filter(Boolean);
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Booking Confirmed!</h2>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;ll send {destinations.join(" and ")}. See you soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (waitlistSubmitted) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">You&apos;re on the waitlist!</h2>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;ll {email ? <>email {email}</> : <>text {phone}</>} the moment a spot opens up.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Choose service */}
      {step === "service" && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 ? (
              <p className="text-sm text-gray-400">No services available for online booking.</p>
            ) : (
              services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); setStep("details"); }}
                  className={`w-full text-left rounded-xl border p-4 hover:border-indigo-400 transition-colors ${
                    selectedService?.id === service.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{service.name}</p>
                      {service.description && (
                        <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{service.durationMinutes} minutes</p>
                    </div>
                    {service.price != null && (
                      <span className="font-semibold" style={{ color: accent }}>
                        {formatCurrency(service.price)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Date/time + contact */}
      {step === "details" && selectedService && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Details</CardTitle>
              <button
                onClick={() => setStep("service")}
                className="text-xs hover:underline"
                style={{ color: accent }}
              >
                ← Change service
              </button>
            </div>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm">
              <span className="font-medium text-indigo-900">{selectedService.name}</span>
              <span className="text-indigo-600 ml-2">· {selectedService.durationMinutes} min</span>
            </div>

            <div>
              <Label htmlFor="bookingDate">Date <span className="text-red-500">*</span></Label>
              <DateWheelPicker id="bookingDate" value={date} onChange={setDate} />
            </div>

            {date && (
              <div>
                <Label>Time <span className="text-red-500">*</span></Label>
                {loadingSlots ? (
                  <p className="mt-2 text-sm text-gray-400">Loading available times…</p>
                ) : slotsError ? (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-600">Couldn&apos;t load available times.</p>
                    <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadSlots}>
                      Try again
                    </Button>
                  </div>
                ) : dayClosed ? (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-600">Not available on this day. Please pick another date.</p>
                  </div>
                ) : fullyBooked ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-900">Fully booked that day</p>
                    <p className="mt-1 text-xs text-amber-700">Want to be notified if a spot opens up?</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setWantsWaitlist(true)}
                    >
                      Join Waitlist
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        title={slot.available ? undefined : "Already booked"}
                        onClick={() => slot.available && setTime(slot.time)}
                        className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm transition-colors ${
                          !slot.available ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through" : ""
                        }`}
                        style={
                          slot.available && time === slot.time
                            ? { borderColor: accent, backgroundColor: `${accent}1a`, color: accent }
                            : undefined
                        }
                      >
                        <Clock className="h-3 w-3" />
                        {formatSlotLabel(slot.time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={(e) => setFirstName(titleCase(e.target.value.trim()))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={(e) => setLastName(titleCase(e.target.value.trim()))}
                  className="mt-1"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              We need at least an email or a phone number to confirm your booking.
            </p>

            <div>
              <Label htmlFor="email">Email {!phone && <span className="text-red-500">*</span>}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(normalizeEmail(e.target.value))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone {!email && <span className="text-red-500">*</span>}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const next = formatPhone(e.target.value);
                  setPhone(next);
                  if (!next) setSmsConsent(false);
                }}
                placeholder="802-258-0000"
                className="mt-1"
              />
            </div>

            {phone && (
              <label className="flex items-start gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600"
                />
                <span>
                  {!email && (
                    <strong className="text-gray-900">
                      Required, since no email was provided
                      <span className="text-red-500">*</span>:{" "}
                    </strong>
                  )}
                  I agree to receive appointment text messages (booking confirmations, reminders, reschedule
                  notices, and waitlist alerts) from {orgName} via SoloSuds at the number above. Msg frequency
                  varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.{" "}
                  <Link href="/terms" target="_blank" className="text-indigo-600 hover:underline">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="text-indigo-600 hover:underline">Privacy Policy</Link>{" "}
                  apply.
                </span>
              </label>
            )}

            <div>
              <Label htmlFor="bookingNotes">Notes for the practitioner</Label>
              <Input id="bookingNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>

            {wantsWaitlist ? (
              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: accent }}
                disabled={submitting}
              >
                {submitting ? "Joining…" : "Join Waitlist"}
              </Button>
            ) : (
              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: accent }}
                disabled={submitting || !time}
              >
                {submitting ? "Booking…" : time ? "Confirm Booking" : "Pick a time above"}
              </Button>
            )}
          </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
