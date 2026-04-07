import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EmailConsentStatus } from "@prisma/client";

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
      select: { id: true, isActive: true, isEmailConsent: true },
    });

    if (!form || !form.isActive) {
      return NextResponse.json({ error: "Form not found or inactive" }, { status: 404 });
    }

    const isConsent = form.isEmailConsent;

    const submission = await db.intakeSubmission.create({
      data: {
        formId: id,
        clientId: clientId ?? null,
        responses: responses ?? {},
        isProtected: isConsent, // consent submissions can never be deleted
      },
    });

    // If this is the email consent form and a clientId was provided, mark the client as consented
    if (isConsent && clientId) {
      await db.client.updateMany({
        where: { id: clientId },
        data: { emailConsentStatus: EmailConsentStatus.CONSENTED },
      });
    }

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("[POST /api/intake-forms/:id/submit]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

