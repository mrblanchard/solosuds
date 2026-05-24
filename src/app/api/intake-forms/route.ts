import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, fields } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const maxSort = await db.intakeForm.aggregate({
      where: { organizationId: session.user.organizationId },
      _max: { sortOrder: true },
    });

    const form = await db.intakeForm.create({
      data: {
        organizationId: session.user.organizationId,
        title: title.trim(),
        description: description ?? null,
        fields: fields ?? [],
        isActive: true,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    console.error("[POST /api/intake-forms]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forms = await db.intakeForm.findMany({
      where: { organizationId: session.user.organizationId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(forms);
  } catch (error) {
    console.error("[GET /api/intake-forms]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
