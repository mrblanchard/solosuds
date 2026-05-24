import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 });
    }

    // Verify all forms belong to this organization
    const forms = await db.intakeForm.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true },
    });
    const orgFormIds = new Set(forms.map((f) => f.id));

    for (const id of orderedIds) {
      if (typeof id !== "string" || !orgFormIds.has(id)) {
        return NextResponse.json({ error: "Invalid form ID in list" }, { status: 400 });
      }
    }

    // Batch update sortOrder
    await db.$transaction(
      orderedIds.map((id: string, index: number) =>
        db.intakeForm.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PUT /api/intake-forms/reorder]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
