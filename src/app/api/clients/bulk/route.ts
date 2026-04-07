import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role === "PRACTITIONER" || user?.role === "FRONT_DESK") {
      return NextResponse.json({ error: "You do not have permission" }, { status: 403 });
    }

    const body = await request.json();
    const { ids, action } = body as { ids: string[]; action: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No client IDs provided" }, { status: 400 });
    }

    if (ids.length > 200) {
      return NextResponse.json({ error: "Maximum 200 clients per bulk action" }, { status: 400 });
    }

    // Verify all clients belong to this org
    const count = await db.client.count({
      where: { id: { in: ids }, organizationId: session.user.organizationId },
    });

    if (count !== ids.length) {
      return NextResponse.json({ error: "One or more clients not found" }, { status: 404 });
    }

    if (action === "archive") {
      await db.client.updateMany({
        where: { id: { in: ids }, organizationId: session.user.organizationId },
        data: { status: "ARCHIVED" },
      });
      return NextResponse.json({ updated: ids.length });
    }

    if (action === "delete") {
      // Nullify protected (consent) submissions first — they cannot be deleted
      await db.intakeSubmission.updateMany({
        where: { clientId: { in: ids }, isProtected: true },
        data: { clientId: null },
      });
      await db.$transaction([
        db.clientTag.deleteMany({ where: { clientId: { in: ids } } }),
        db.soapNote.deleteMany({ where: { clientId: { in: ids } } }),
        db.appointment.deleteMany({ where: { clientId: { in: ids } } }),
        db.intakeSubmission.deleteMany({ where: { clientId: { in: ids }, isProtected: false } }),
        db.invoice.deleteMany({ where: { clientId: { in: ids } } }),
        db.message.deleteMany({ where: { clientId: { in: ids } } }),
        db.email.deleteMany({ where: { clientId: { in: ids } } }),
        db.client.deleteMany({ where: { id: { in: ids }, organizationId: session.user.organizationId } }),
      ]);
      return NextResponse.json({ deleted: ids.length });
    }

    return NextResponse.json({ error: "Invalid action. Use 'archive' or 'delete'" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/clients/bulk]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
