import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendAppointmentReminder } from "@/lib/email";
import { formatDate } from "@/lib/utils";

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
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
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
    select: { name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true },
  });

  const apptDate = formatDate(appointment.startTime);
  const apptTime = appointment.startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const publicToken = appointment.publicToken ?? randomUUID();
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

  // Track last reminder sent
  await db.appointment.update({
    where: { id },
    data: { reminderSentAt: new Date(), publicToken },
  });

  return NextResponse.json({ success: true });
}
