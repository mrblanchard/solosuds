"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface Props {
  token: string;
  orgId: string;
  status: string;
  serviceId: string | null;
  serviceName: string;
  durationMinutes: number;
  clientName: string | null;
  formattedDate: string;
  formattedTime: string;
  accent?: string;
}

export default function ManageBookingClient({
  token,
  orgId,
  status: initialStatus,
  serviceId,
  serviceName,
  durationMinutes,
  formattedDate,
  formattedTime,
  clientName,
  accent = "#4f46e5",
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rescheduled, setRescheduled] = useState<{ date: string; time: string } | null>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [fullyBooked, setFullyBooked] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !date) return;
    setLoadingSlots(true);
    setTime("");
    setSlotsError(false);
    setDayClosed(false);
    try {
      const res = await fetch(`/api/book/availability?orgId=${orgId}&serviceId=${serviceId}&date=${date}`);
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
  }, [orgId, serviceId, date]);

  useEffect(() => {
    if (mode === "reschedule") loadSlots();
  }, [mode, loadSlots]);

  async function cancelAppointment() {
    if (!confirm("Cancel this appointment?")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${token}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to cancel");
      }
      setStatus("CANCELLED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReschedule() {
    if (!date || !time) {
      setError("Please pick a date and time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const newStart = new Date(`${date}T${time}`);
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
      const res = await fetch(`/api/manage/${token}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to reschedule");
      }
      setRescheduled({ date, time });
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule");
      loadSlots();
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "CANCELLED") {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <XCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Appointment Cancelled</h2>
          <p className="mt-2 text-sm text-gray-500">This appointment has been cancelled.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "COMPLETED") {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">This appointment has already happened</h2>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{serviceName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {rescheduled && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Rescheduled to {rescheduled.date} at {rescheduled.time}.
          </div>
        )}

        {clientName && <p className="text-sm text-gray-500">For {clientName}</p>}

        {mode === "view" && !rescheduled && (
          <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm">
            <span className="font-medium text-indigo-900">{formattedDate}</span>
            <span className="text-indigo-600 ml-2">at {formattedTime}</span>
          </div>
        )}

        {mode === "view" ? (
          <div className="flex gap-2">
            {serviceId && (
              <Button type="button" variant="outline" onClick={() => setMode("reschedule")} disabled={submitting}>
                Reschedule
              </Button>
            )}
            <Button type="button" variant="destructive" onClick={cancelAppointment} disabled={submitting}>
              Cancel Appointment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New date</label>
              <DateWheelPicker id="rescheduleDate" value={date} onChange={setDate} />
            </div>

            {date && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">New time</label>
                {loadingSlots ? (
                  <p className="text-sm text-gray-400">Loading available times…</p>
                ) : slotsError ? (
                  <div>
                    <p className="text-sm text-gray-600">Couldn&apos;t load available times.</p>
                    <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadSlots}>
                      Try again
                    </Button>
                  </div>
                ) : dayClosed ? (
                  <p className="text-sm text-gray-600">Not available on this day. Please pick another date.</p>
                ) : fullyBooked ? (
                  <p className="text-sm text-amber-700">No openings that day, please try another date.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className="flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm transition-colors"
                        style={
                          time === slot
                            ? { borderColor: accent, backgroundColor: `${accent}1a`, color: accent }
                            : undefined
                        }
                      >
                        <Clock className="h-3 w-3" />
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setMode("view")} disabled={submitting}>
                Back
              </Button>
              <Button type="button" style={{ backgroundColor: accent }} onClick={submitReschedule} disabled={submitting || !time}>
                {submitting ? "Saving…" : "Confirm New Time"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
