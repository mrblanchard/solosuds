"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { formatCurrency } from "@/lib/utils";
import { formatPhone, stripPhone, titleCase, normalizeEmail } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  description: string | null;
}

interface Props {
  orgId: string;
  services: Service[];
  timezone: string;
}

export default function PublicBookingForm({ orgId, services, timezone }: Props) {
  const [step, setStep] = useState<"service" | "details" | "confirm">("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function submit() {
    if (!selectedService || !date || !time || !firstName || !lastName || !email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (firstName.length > 100 || lastName.length > 100) {
      setError("Name is too long.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone && !/^[+]?[\d-]{7,20}$/.test(stripPhone(phone))) {
      setError("Please enter a valid phone number.");
      return;
    }
    if (notes.length > 5000) {
      setError("Notes are too long.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + selectedService.durationMinutes * 60000);

    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        serviceId: selectedService.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        clientFirstName: firstName.trim(),
        clientLastName: lastName.trim(),
        clientEmail: normalizeEmail(email),
        clientPhone: stripPhone(phone),
        notes,
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      setConfirmed(true);
    } else {
      const json = await res.json();
      setError(json.error ?? "Booking failed. Please try again.");
    }
  }

  if (confirmed) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Booking Confirmed!</h2>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;ll send a confirmation to {email}. See you soon!
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
                      <span className="font-semibold text-indigo-600">
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
                className="text-xs text-indigo-600 hover:underline"
              >
                ← Change service
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm">
              <span className="font-medium text-indigo-900">{selectedService.name}</span>
              <span className="text-indigo-600 ml-2">· {selectedService.durationMinutes} min</span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bookingDate">Date <span className="text-red-500">*</span></Label>
                <DateWheelPicker
                  id="bookingDate"
                  value={date}
                  onChange={setDate}
                />
              </div>
              <div>
                <Label htmlFor="bookingTime">Time <span className="text-red-500">*</span></Label>
                <Input id="bookingTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
              </div>
            </div>

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

            <div>
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="802-258-0000"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bookingNotes">Notes for the practitioner</Label>
              <Input id="bookingNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1" />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Booking…" : "Confirm Booking"}
            </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
