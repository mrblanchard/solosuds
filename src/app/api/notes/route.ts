import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string(),
  sessionDate: z.string(),
  templateId: z.string().optional(),
  appointmentId: z.string().optional(),
  duplicateFromId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { clientId, sessionDate, templateId, appointmentId, duplicateFromId } = parsed.data;

  // Verify client belongs to org
  const client = await db.client.findFirst({ where: { id: clientId, organizationId: orgId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  let duplicateData: Record<string, unknown> = {};
  if (duplicateFromId) {
    const source = await db.soapNote.findFirst({
      where: { id: duplicateFromId, organizationId: orgId },
    });
    if (source) {
      duplicateData = {
        subjective: source.subjective,
        objective: source.objective,
        assessment: source.assessment,
        plan: source.plan,
        diagnosisCodes: source.diagnosisCodes,
        procedureCodes: source.procedureCodes,
      };
    }
  }

  const note = await db.soapNote.create({
    data: {
      organizationId: orgId,
      clientId,
      practitionerId: session.user.id,
      sessionDate: new Date(sessionDate),
      templateId: templateId || undefined,
      appointmentId: appointmentId || undefined,
      status: "DRAFT",
      ...duplicateData,
    },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");

  const notes = await db.soapNote.findMany({
    where: {
      organizationId: orgId,
      ...(clientId ? { clientId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: { client: true, practitioner: { select: { name: true } } },
    orderBy: { sessionDate: "desc" },
    take: 100,
  });

  return NextResponse.json(notes);
}
