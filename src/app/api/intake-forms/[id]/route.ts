import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await db.intakeForm.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { title, description, fields, isActive } = body;

    if (title !== undefined && !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const updated = await db.intakeForm.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(fields !== undefined && { fields }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/intake-forms/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const delUser = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (delUser?.role === "PRACTITIONER" || delUser?.role === "FRONT_DESK") {
      return NextResponse.json({ error: "You do not have permission to delete" }, { status: 403 });
    }

    const form = await db.intakeForm.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.intakeForm.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/intake-forms/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
