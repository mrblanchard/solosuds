import { db } from "@/lib/db";
import { sendAppointmentReminder } from "@/lib/email";
import { formatDate } from "@/lib/utils";

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // remind once an appointment is within 24h

/**
 * Finds upcoming appointments within the reminder window that haven't been
 * reminded yet, and emails the client automatically. Appointments already
 * reminded (reminderSentAt set, whether by this sweep or a manual send) are
 * skipped, so a practitioner can still send one manually ahead of time without
 * getting a duplicate from the sweep.
 */
export async function runReminderSweep(): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueAppointments = await db.appointment.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startTime: { gte: now, lte: windowEnd },
      reminderSentAt: null,
      client: { email: { not: null } },
    },
    include: {
      client: { select: { firstName: true, lastName: true, email: true } },
      service: { select: { name: true } },
      practitioner: { select: { name: true } },
      organization: {
        select: { name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const appt of dueAppointments) {
    if (!appt.client?.email) continue;
    try {
      await sendAppointmentReminder({
        to: appt.client.email,
        clientName: `${appt.client.firstName} ${appt.client.lastName}`,
        practitionerName: appt.practitioner?.name ?? appt.organization.name,
        appointmentDate: formatDate(appt.startTime, "MMMM d, yyyy"),
        appointmentTime: formatDate(appt.startTime, "h:mm a"),
        serviceName: appt.service?.name ?? "Session",
        startDateTime: appt.startTime.toISOString(),
        endDateTime: appt.endTime.toISOString(),
        branding: appt.organization,
      });
      await db.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[reminder-sweep] Failed to send reminder for appointment ${appt.id}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}

let started = false;

/** Starts the recurring background sweep. Safe to call multiple times, only starts once. */
export function startReminderSweep(): void {
  if (started) return;
  started = true;

  runReminderSweep().catch((err) => console.error("[reminder-sweep] Initial sweep failed:", err));

  setInterval(() => {
    runReminderSweep().catch((err) => console.error("[reminder-sweep] Sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
}
