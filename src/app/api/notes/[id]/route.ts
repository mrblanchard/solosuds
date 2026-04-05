import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  sessionNotes: z.string().optional(),
  noteFormat: z.enum(["SOAP", "SESSION"]).optional(),
  diagnosisCodes: z.string().optional(),
  procedureCodes: z.string().optional(),
  transcript: z.string().optional(),
  action: z.enum(["save", "sign"]).default("save"),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { id } = await params;

  const note = await db.soapNote.findFirst({ where: { id, organizationId: orgId } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (note.status === "LOCKED") {
    return NextResponse.json({ error: "Note is locked" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { action, diagnosisCodes, procedureCodes, ...fields } = parsed.data;

  const updated = await db.soapNote.update({
    where: { id },
    data: {
      ...fields,
      diagnosisCodes: diagnosisCodes
        ? diagnosisCodes.split(",").map((c) => c.trim()).filter(Boolean)
        : note.diagnosisCodes,
      procedureCodes: procedureCodes
        ? procedureCodes.split(",").map((c) => c.trim()).filter(Boolean)
        : note.procedureCodes,
      status: action === "sign" ? "SIGNED" : note.status === "DRAFT" ? "DRAFT" : note.status,
      signedAt: action === "sign" ? new Date() : note.signedAt,
      signedBy: action === "sign" ? session.user.name ?? session.user.email : note.signedBy,
    },
  });

  return NextResponse.json(updated);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = session.user.organizationId;

  const note = await db.soapNote.findFirst({
    where: { id, organizationId: orgId },
    include: { client: true, practitioner: { select: { name: true } } },
  });

  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const delUser = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (delUser?.role === "PRACTITIONER" || delUser?.role === "FRONT_DESK") {
    return NextResponse.json({ error: "You do not have permission to delete" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  const note = await db.soapNote.findFirst({ where: { id, organizationId: orgId } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (note.status === "LOCKED") {
    return NextResponse.json({ error: "Cannot delete a locked note" }, { status: 400 });
  }

  await db.soapNote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
