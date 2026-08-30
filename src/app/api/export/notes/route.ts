import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv, csvFilename } from "@/lib/csv";

// Session/SOAP note export — METADATA ONLY. Deliberately excludes the actual
// clinical note content (subjective/objective/assessment/plan/sessionNotes/
// transcript/aiSuggestions/diagnosisCodes/procedureCodes), since that is
// sensitive clinical content that shouldn't go into a bulk CSV dump without a
// separate, explicit decision to include it.
const MAX_ROWS = 10000;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role === "PRACTITIONER" || user?.role === "FRONT_DESK") {
      return NextResponse.json({ error: "You do not have permission" }, { status: 403 });
    }

    const orgId = session.user.organizationId;

    const notes = await db.soapNote.findMany({
      where: { organizationId: orgId },
      orderBy: { sessionDate: "desc" },
      take: MAX_ROWS,
      select: {
        id: true,
        sessionDate: true,
        status: true,
        noteFormat: true,
        signedAt: true,
        createdAt: true,
        client: { select: { firstName: true, lastName: true } },
        practitioner: { select: { name: true } },
      },
    });

    const csv = toCsv(
      [
        { key: "clientName", label: "Client" },
        { key: "practitionerName", label: "Practitioner" },
        { key: "sessionDate", label: "Session Date" },
        { key: "status", label: "Status" },
        { key: "noteFormat", label: "Format" },
        { key: "signedAt", label: "Signed At" },
        { key: "createdAt", label: "Created At" },
      ],
      notes.map((n) => ({
        clientName: `${n.client.firstName} ${n.client.lastName}`,
        practitionerName: n.practitioner.name ?? "",
        sessionDate: n.sessionDate.toISOString().slice(0, 10),
        status: n.status,
        noteFormat: n.noteFormat,
        signedAt: n.signedAt ? n.signedAt.toISOString() : "",
        createdAt: n.createdAt.toISOString(),
      }))
    );

    await db.exportAuditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id!,
        dataType: "notes",
        recordCount: notes.length,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("session-notes-log")}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/export/notes]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
