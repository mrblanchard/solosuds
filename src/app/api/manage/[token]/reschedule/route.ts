import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasConflict, notifyWaitlistForOpening, validateBookingWindow } from "@/lib/scheduling";
import { sendAppointmentReminder } from "@/lib/email";
import { sendSms, buildAppointmentRescheduledSms } from "@/lib/twilio";
import { zonedTimeToUtc, formatZonedDisplay } from "@/lib/timezone";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { date, time } = body;

  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return NextResponse.json({ error: "A valid date and time are required" }, { status: 400 });
  }

  const appointment = await db.appointment.findFirst({
    where: { publicToken: token },
    include: {
      client: { select: { firstName: true, lastName: true, email: true, phone: true, smsConsentedAt: true } },
      service: { select: { name: true, durationMinutes: true } },
      practitioner: { select: { name: true } },
      organization: {
        select: { name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true, timezone: true },
      },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    return NextResponse.json({ error: "This appointment can no longer be rescheduled" }, { status: 400 });
  }

  // Derive the instant server-side from the org's own timezone — see the
  // matching comment in /api/book for why this can't be trusted from the client.
  const [hh, mm] = time.split(":").map(Number);
  const durationMinutes = appointment.service?.durationMinutes ?? 60;
  const newStart = zonedTimeToUtc(date, hh, mm, appointment.organization.timezone);
  const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

  const windowCheck = await validateBookingWindow({
    organizationId: appointment.organizationId,
    startTime: newStart,
    excludeAppointmentId: appointment.id,
  });
  if (!windowCheck.ok) {
    return NextResponse.json({ error: windowCheck.error }, { status: 409 });
  }

  const conflict = await hasConflict({
    organizationId: appointment.organizationId,
    practitionerId: appointment.practitionerId,
    startTime: newStart,
    endTime: newEnd,
    excludeAppointmentId: appointment.id,
  });
  if (conflict) {
    return NextResponse.json({ error: "That time is no longer available. Please pick a different time." }, { status: 409 });
  }

  const previousStart = appointment.startTime;

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      startTime: newStart,
      endTime: newEnd,
      reminderSentAt: null, // fresh reminder should fire for the new time
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
  const manageUrl = `${baseUrl}/manage/${token}`;

  const zonedDisplay = formatZonedDisplay(newStart, appointment.organization.timezone);

  if (appointment.client?.email) {
    try {
      await sendAppointmentReminder({
        to: appointment.client.email,
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        practitionerName: appointment.practitioner?.name ?? appointment.organization.name,
        appointmentDate: zonedDisplay.dateStr,
        appointmentTime: zonedDisplay.timeStr,
        serviceName: appointment.service?.name ?? "Session",
        startDateTime: newStart.toISOString(),
        endDateTime: newEnd.toISOString(),
        branding: appointment.organization,
        manageUrl,
        kind: "rescheduled",
      });
    } catch (err) {
      console.error("[reschedule] Failed to send confirmation email:", err);
    }
  }

  if (appointment.client?.phone && appointment.client.smsConsentedAt) {
    try {
      await sendSms({
        to: appointment.client.phone,
        body: buildAppointmentRescheduledSms({ startTime: newStart, manageUrl }),
      });
    } catch (err) {
      console.error("[reschedule] Failed to send confirmation SMS:", err);
    }
  }

  // The old slot just opened up
  notifyWaitlistForOpening({
    organizationId: appointment.organizationId,
    serviceId: appointment.serviceId,
    openingDate: previousStart,
  }).catch((err) => console.error("[waitlist notify]", err));

  return NextResponse.json({ success: true });
}
