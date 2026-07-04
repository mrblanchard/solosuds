"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Heart, Bell, CheckCircle2, AlertCircle, Mail } from "lucide-react";

interface UpcomingAppointment {
  id: string;
  startTime: string;
  endTime: string;
  serviceName: string | null;
  reminderSentAt: string | null;
}

interface ClientReminderPanelProps {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  sessionDate: string; // ISO string
  upcomingAppointments: UpcomingAppointment[];
}

function formatApptDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ClientReminderPanel({
  clientId,
  clientName,
  clientEmail,
  sessionDate,
  upcomingAppointments,
}: ClientReminderPanelProps) {
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [thankYouSent, setThankYouSent] = useState(false);
  const [thankYouLoading, setThankYouLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const noEmail = !clientEmail;

  async function sendReminder(appointmentId: string) {
    setLoadingMap((p) => ({ ...p, [appointmentId]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/send-reminder`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? "Failed to send");
      } else {
        setSentMap((p) => ({ ...p, [appointmentId]: true }));
      }
    } catch {
      setErrorMsg("Failed to send reminder");
    } finally {
      setLoadingMap((p) => ({ ...p, [appointmentId]: false }));
    }
  }

  async function sendThankYou() {
    setThankYouLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/send-thankyou`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate: new Date(sessionDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? "Failed to send");
      } else {
        setThankYouSent(true);
      }
    } catch {
      setErrorMsg("Failed to send thank-you");
    } finally {
      setThankYouLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-3 bg-purple-50">
        <Bell className="h-4 w-4 text-purple-600" />
        <div>
          <p className="font-semibold text-gray-900">Client Reminders</p>
          <p className="text-xs text-gray-500">Send emails to {clientName}</p>
        </div>
        {noEmail && (
          <Badge variant="warning" className="ml-auto">No email on file</Badge>
        )}
      </div>

      <div className="p-4 space-y-3">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Thank-you card */}
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Heart className="h-4 w-4 text-pink-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Thank-you card</p>
              <p className="text-xs text-gray-500">For today&apos;s session</p>
            </div>
          </div>
          {thankYouSent ? (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Sent
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={sendThankYou}
              disabled={thankYouLoading || noEmail}
            >
              {thankYouLoading ? (
                <span className="h-3.5 w-3.5 mr-1 animate-spin rounded-full border-2 border-gray-400 border-t-transparent inline-block" />
              ) : (
                <Mail className="h-3.5 w-3.5 mr-1" />
              )}
              Send
            </Button>
          )}
        </div>

        {/* Upcoming appointment reminders */}
        {upcomingAppointments.length === 0 ? (
          <p className="text-xs text-gray-400 px-1">No upcoming appointments scheduled.</p>
        ) : (
          upcomingAppointments.map((appt) => {
            const days = daysUntil(appt.startTime);
            const alreadySent = !!appt.reminderSentAt || sentMap[appt.id];
            const isSending = loadingMap[appt.id];
            const label =
              days <= 1
                ? "1-day reminder"
                : days <= 7
                ? "7-day reminder"
                : "Appointment reminder";
            const daysLabel =
              days === 0
                ? "Today"
                : days === 1
                ? "Tomorrow"
                : `In ${days} days`;

            return (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Send className="h-4 w-4 text-indigo-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">
                      {appt.serviceName ?? "Appointment"} · {formatApptDate(appt.startTime)} ({daysLabel})
                    </p>
                    {appt.reminderSentAt && !sentMap[appt.id] && (
                      <p className="text-xs text-gray-400">
                        Last sent {new Date(appt.reminderSentAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {alreadySent && (
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Sent
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendReminder(appt.id)}
                    disabled={isSending || noEmail}
                  >
                    {isSending ? (
                      <span className="h-3.5 w-3.5 mr-1 animate-spin rounded-full border-2 border-gray-400 border-t-transparent inline-block" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1" />
                    )}
                    {alreadySent ? "Resend" : "Send"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
