import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendAppointmentReminder } from "@/lib/email";
import { ensurePublicToken } from "@/lib/scheduling";
import { sendSms, buildAppointmentReminderSms } from "@/lib/twilio";
import { formatZonedDisplay } from "@/lib/timezone";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const appointment = await db.appointment.findFirst({
    where: { id, organizationId: orgId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, smsConsentedAt: true } },
      practitioner: { select: { name: true } },
      service: { select: { name: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!appointment.client.email) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 400 });
  }

  const branding = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true, timezone: true },
  });

  const zonedDisplay = formatZonedDisplay(appointment.startTime, branding?.timezone ?? "America/New_York");
  const apptDate = zonedDisplay.dateStr;
  const apptTime = zonedDisplay.timeStr;

  const publicToken = await ensurePublicToken(appointment.id, appointment.publicToken);
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";

  await sendAppointmentReminder({
    to: appointment.client.email,
    clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
    practitionerName: appointment.practitioner.name ?? "Your Practitioner",
    appointmentDate: apptDate,
    appointmentTime: apptTime,
    serviceName: appointment.service?.name ?? "Appointment",
    startDateTime: appointment.startTime.toISOString(),
    endDateTime: appointment.endTime.toISOString(),
    branding,
    manageUrl: `${baseUrl}/manage/${publicToken}`,
  });

  if (appointment.client.phone && appointment.client.smsConsentedAt) {
    try {
      await sendSms({
        to: appointment.client.phone,
        body: buildAppointmentReminderSms({
          orgName: branding?.name ?? "Your practice",
          serviceName: appointment.service?.name ?? "Appointment",
          startTime: appointment.startTime,
        }),
      });
    } catch (err) {
      console.warn("[send-reminder] Failed to send reminder SMS:", err);
    }
  }

  // Track last reminder sent
  await db.appointment.update({
    where: { id },
    data: { reminderSentAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
