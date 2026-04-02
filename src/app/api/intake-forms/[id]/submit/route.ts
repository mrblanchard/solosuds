import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { responses, clientId } = body;

    const form = await db.intakeForm.findUnique({
      where: { id },
    });

    if (!form || !form.isActive) {
      return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
    }

    const submission = await db.intakeSubmission.create({
      data: {
        formId: id,
        clientId: clientId ?? null,
        responses: responses ?? {},
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("[POST /api/intake-forms/:id/submit]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
