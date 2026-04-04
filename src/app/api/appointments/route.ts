import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAppointmentReminder } from "@/lib/email";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  clientId: z.string(),
  practitionerId: z.string(),
  serviceId: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
  sendReminder: z.boolean().default(true),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { sendReminder, startTime, endTime, serviceId, ...data } = parsed.data;

  // Verify client belongs to org
  const client = await db.client.findFirst({
    where: { id: data.clientId, organizationId: orgId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const practitioner = await db.user.findFirst({
    where: { id: data.practitionerId, organizationId: orgId },
    select: { id: true, name: true },
  });
  if (!practitioner) return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });

  let appointment;
  try {
    appointment = await db.appointment.create({
      data: {
        ...data,
        organizationId: orgId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        serviceId: serviceId || undefined,
        status: "SCHEDULED",
      },
      include: { service: true },
    });
  } catch (err) {
    console.error("[appointments POST] DB error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // Queue email reminder if client has email
  if (sendReminder && client.email) {
    try {
      await sendAppointmentReminder({
        to: client.email,
        clientName: `${client.firstName} ${client.lastName}`,
        practitionerName: practitioner.name ?? "Your practitioner",
        appointmentDate: formatDate(appointment.startTime, "MMMM d, yyyy"),
        appointmentTime: formatDate(appointment.startTime, "h:mm a"),
        serviceName: appointment.service?.name ?? "Session",
      });
    } catch (err) {
      console.error("Failed to send reminder:", err);
    }
  }

  // Auto-create draft note for this appointment
  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { noteType: true, defaultIntakeFormId: true },
    });

    await db.soapNote.create({
      data: {
        organizationId: orgId,
        clientId: data.clientId,
        practitionerId: data.practitionerId,
        appointmentId: appointment.id,
        sessionDate: new Date(startTime),
        status: "DRAFT",
        noteFormat: org?.noteType ?? "SOAP",
      },
    });

    // Auto-send intake form if org has a default one configured
    if (org?.defaultIntakeFormId && client.email) {
      const intakeForm = await db.intakeForm.findFirst({
        where: { id: org.defaultIntakeFormId, organizationId: orgId, isActive: true },
        select: { id: true, title: true },
      });

      if (intakeForm) {
        const baseUrl = process.env.NEXTAUTH_URL ?? "https://soapsuds.app";
        const intakeUrl = `${baseUrl}/intake/${intakeForm.id}?clientId=${data.clientId}`;

        try {
          const { sendEmail } = await import("@/lib/email");
          await sendEmail({
            to: client.email,
            subject: `Please complete: ${intakeForm.title}`,
            html: `
              <p>Hi ${client.firstName},</p>
              <p>You have an upcoming appointment scheduled for ${formatDate(appointment.startTime, "MMMM d, yyyy")} at ${formatDate(appointment.startTime, "h:mm a")}.</p>
              <p>Please take a moment to fill out the following form before your visit:</p>
              <p><a href="${intakeUrl}" style="display:inline-block;padding:10px 20px;background-color:#6366f1;color:white;border-radius:8px;text-decoration:none;font-weight:500;">Complete ${intakeForm.title}</a></p>
              <p>Thank you!</p>
            `,
          });
        } catch (emailErr) {
          console.error("Failed to send intake form email:", emailErr);
        }
      }
    }
  } catch (noteErr) {
    console.error("Failed to auto-create draft note:", noteErr);
  }

  return NextResponse.json(appointment, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(req.url);

  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const clientId = searchParams.get("clientId");

  const appointments = await db.appointment.findMany({
    where: {
      organizationId: orgId,
      ...(start && end
        ? { startTime: { gte: new Date(start), lte: new Date(end) } }
        : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      practitioner: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(appointments);
}
