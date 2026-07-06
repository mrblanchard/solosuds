import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasConflict, notifyWaitlistForOpening, validateBookingWindow } from "@/lib/scheduling";
import { sendAppointmentReminder } from "@/lib/email";
import { formatDate } from "@/lib/utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { startTime, endTime } = body;

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
  }

  const appointment = await db.appointment.findFirst({
    where: { publicToken: token },
    include: {
      client: { select: { firstName: true, lastName: true, email: true } },
      service: { select: { name: true } },
      practitioner: { select: { name: true } },
      organization: {
        select: { name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true },
      },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    return NextResponse.json({ error: "This appointment can no longer be rescheduled" }, { status: 400 });
  }

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

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

  if (appointment.client?.email) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
    try {
      await sendAppointmentReminder({
        to: appointment.client.email,
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        practitionerName: appointment.practitioner?.name ?? appointment.organization.name,
        appointmentDate: formatDate(newStart, "MMMM d, yyyy"),
        appointmentTime: formatDate(newStart, "h:mm a"),
        serviceName: appointment.service?.name ?? "Session",
        startDateTime: newStart.toISOString(),
        endDateTime: newEnd.toISOString(),
        branding: appointment.organization,
        manageUrl: `${baseUrl}/manage/${token}`,
        kind: "rescheduled",
      });
    } catch (err) {
      console.error("[reschedule] Failed to send confirmation email:", err);
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
