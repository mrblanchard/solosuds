import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sendAppointmentReminder } from "@/lib/email";
import { hasConflict } from "@/lib/scheduling";
import { formatZonedDisplay } from "@/lib/timezone";

const schema = z.object({
  // Client: either select an existing client by id, OR pass a name to create one on the fly
  clientId: z.string().optional(),
  clientName: z.string().max(200).optional(),
  // Practitioner is optional — defaults to the current user on the server
  practitionerId: z.string().optional(),
  serviceId: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
  sendReminder: z.boolean().default(true),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("NONE"),
});

// How many future occurrences to generate for each recurrence cadence (roughly 6 months out)
const OCCURRENCE_COUNT: Record<string, number> = {
  DAILY: 60,
  WEEKLY: 26,
  BIWEEKLY: 13,
  MONTHLY: 6,
};

function nextOccurrence(date: Date, recurrence: string): Date {
  const next = new Date(date);
  if (recurrence === "DAILY") next.setDate(next.getDate() + 1);
  else if (recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (recurrence === "BIWEEKLY") next.setDate(next.getDate() + 14);
  else if (recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
  return next;
}

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

  const { sendReminder, startTime, endTime, serviceId, clientId, clientName, practitionerId, notes, recurrence } = parsed.data;

  // Resolve practitioner — default to the current user
  const resolvedPractitionerId = practitionerId || session.user.id;

  const conflict = await hasConflict({
    organizationId: orgId,
    practitionerId: resolvedPractitionerId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
  });
  if (conflict) {
    return NextResponse.json(
      { error: "This practitioner already has an appointment during that time." },
      { status: 409 }
    );
  }

  // Resolve client — use existing if clientId provided, create minimal record if name given
  let resolvedClientId: string | undefined;
  let client: { id: string; email: string | null; firstName: string; lastName: string } | null = null;

  if (clientId) {
    const found = await db.client.findFirst({
      where: { id: clientId, organizationId: orgId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!found) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    resolvedClientId = found.id;
    client = found;
  } else if (clientName?.trim()) {
    const parts = clientName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    const created = await db.client.create({
      data: { organizationId: orgId, firstName, lastName, status: "ACTIVE" },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    resolvedClientId = created.id;
    client = created;
  }

  const recurrenceGroupId = recurrence !== "NONE" ? randomUUID() : undefined;

  let appointment;
  let skippedOccurrences = 0;
  try {
    appointment = await db.appointment.create({
      data: {
        organizationId: orgId,
        ...(resolvedClientId && { clientId: resolvedClientId }),
        practitionerId: resolvedPractitionerId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        serviceId: serviceId || undefined,
        notes: notes || undefined,
        status: "SCHEDULED",
        recurrence,
        recurrenceGroupId,
        publicToken: randomUUID(),
      },
      include: { service: true },
    });

    // Generate future occurrences for recurring appointments, skipping any that conflict
    if (recurrence !== "NONE") {
      const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      let cursorStart = new Date(startTime);
      const count = OCCURRENCE_COUNT[recurrence] ?? 0;

      for (let i = 1; i < count; i++) {
        cursorStart = nextOccurrence(cursorStart, recurrence);
        const cursorEnd = new Date(cursorStart.getTime() + durationMs);

        const occurrenceConflict = await hasConflict({
          organizationId: orgId,
          practitionerId: resolvedPractitionerId,
          startTime: cursorStart,
          endTime: cursorEnd,
        });

        if (occurrenceConflict) {
          skippedOccurrences++;
          continue;
        }

        await db.appointment.create({
          data: {
            organizationId: orgId,
            ...(resolvedClientId && { clientId: resolvedClientId }),
            practitionerId: resolvedPractitionerId,
            startTime: cursorStart,
            endTime: cursorEnd,
            serviceId: serviceId || undefined,
            notes: notes || undefined,
            status: "SCHEDULED",
            recurrence,
            recurrenceGroupId,
            publicToken: randomUUID(),
          },
        });
      }
    }
  } catch (err) {
    console.error("[appointments POST] DB error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const orgForTimezone = await db.organization.findUnique({ where: { id: orgId }, select: { timezone: true } });
  const orgTimezone = orgForTimezone?.timezone ?? "America/New_York";
  const zonedDisplay = formatZonedDisplay(appointment.startTime, orgTimezone);

  // Send reminder email only if we have a client with an email
  if (sendReminder && client?.email) {
    try {
      const practitioner = await db.user.findUnique({
        where: { id: resolvedPractitionerId },
        select: { name: true },
      });
      const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
      await sendAppointmentReminder({
        to: client.email,
        clientName: `${client.firstName} ${client.lastName}`,
        practitionerName: practitioner?.name ?? "Your practitioner",
        appointmentDate: zonedDisplay.dateStr,
        appointmentTime: zonedDisplay.timeStr,
        serviceName: appointment.service?.name ?? "Session",
        startDateTime: appointment.startTime.toISOString(),
        endDateTime: appointment.endTime.toISOString(),
        manageUrl: `${baseUrl}/manage/${appointment.publicToken}`,
      });
    } catch (err) {
      console.error("Failed to send reminder:", err);
    }
  }

  // Auto-create draft note only if we have both a client and practitioner
  if (resolvedClientId) {
    try {
      const org = await db.organization.findUnique({
        where: { id: orgId },
        select: { noteType: true, defaultIntakeFormId: true, slug: true },
      });

      await db.soapNote.create({
        data: {
          organizationId: orgId,
          clientId: resolvedClientId,
          practitionerId: resolvedPractitionerId,
          appointmentId: appointment.id,
          sessionDate: new Date(startTime),
          status: "DRAFT",
          noteFormat: org?.noteType ?? "SOAP",
        },
      });

      // Auto-send intake form if org has a default one and client has email
      if (org?.defaultIntakeFormId && client?.email) {
        const intakeForm = await db.intakeForm.findFirst({
          where: { id: org.defaultIntakeFormId, organizationId: orgId, isActive: true },
          select: { id: true, title: true },
        });

        if (intakeForm) {
          const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
          const intakeUrl = `${baseUrl}/intake/${org.slug}/${intakeForm.id}?clientId=${resolvedClientId}`;
          try {
            const { sendEmail } = await import("@/lib/email");
            await sendEmail({
              to: client!.email!,
              subject: `Please complete: ${intakeForm.title}`,
              html: `
                <p>Hi ${client!.firstName},</p>
                <p>You have an upcoming appointment scheduled for ${zonedDisplay.dateStr} at ${zonedDisplay.timeStr}.</p>
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
  }

  return NextResponse.json({ ...appointment, skippedOccurrences }, { status: 201 });
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
