import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const original = await db.intakeForm.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!original) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const maxSort = await db.intakeForm.aggregate({
      where: { organizationId: session.user.organizationId },
      _max: { sortOrder: true },
    });

    const copy = await db.intakeForm.create({
      data: {
        organizationId: session.user.organizationId,
        title: `${original.title} (Copy)`,
        description: original.description,
        fields: original.fields ?? [],
        isActive: false,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { _count: { select: { submissions: true } } },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    console.error("[POST /api/intake-forms/:id/duplicate]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
