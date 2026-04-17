import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { EmailConsentStatus } from "@prisma/client";

// POST — send (or resend) the email consent form to the client
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const orgId = session.user.organizationId;

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true, firstName: true, lastName: true, email: true, emailConsentStatus: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (!client.email) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 400 });
  }

  if (client.emailConsentStatus === EmailConsentStatus.CONSENTED) {
    return NextResponse.json({ error: "Client has already consented" }, { status: 400 });
  }

  // Find or create the org's email consent form
  let consentForm = await db.intakeForm.findFirst({
    where: { organizationId: orgId, isEmailConsent: true, isActive: true },
    select: { id: true },
  });

  if (!consentForm) {
    // Org was created before this feature — create the form now
    consentForm = await db.intakeForm.create({
      data: {
        organizationId: orgId,
        title: "Email Communication Consent",
        description:
          "Before we communicate with you via email, we need your consent. Standard email is not fully encrypted and may not be HIPAA-secure. Please read and sign below.",
        isEmailConsent: true,
        isActive: true,
        sortOrder: 0,
        fields: [
          { id: "ec_heading", type: "heading", label: "Email Communication Consent", required: false },
          {
            id: "ec_risk_info",
            type: "info",
            label: "Please read before signing",
            required: false,
            content: [
              {
                heading: "How email works",
                body: "When you send an email, it travels across the internet through many different computer systems before it reaches its destination — a bit like a postcard being passed from person to person. Unlike a sealed letter, a standard email can potentially be read by others along the way.",
              },
              {
                heading: "What this means for your health information",
                body: "Your provider may want to email you things like appointment reminders, billing questions, or general health information. Because standard email is not fully secure, there is a small chance that someone other than you could read those messages. Your personal health details could be exposed.",
              },
              {
                heading: "What is HIPAA?",
                body: "HIPAA is a federal law that protects your private health information. Fully secure messaging systems use strong encryption (think of it as a combination lock that only you and your provider can open). Standard email — like Gmail, Yahoo, or Outlook — does not always guarantee that same level of protection.",
              },
              {
                heading: "You are in control",
                body: "You do not have to consent. Saying no will not affect your care in any way. If you do consent, you can change your mind at any time — just let your provider know and they will stop sending emails immediately.",
              },
            ],
          },
          { id: "ec_name", type: "text", label: "Your Full Name", placeholder: "First and Last Name", required: true },
          {
            id: "ec_understand_risk",
            type: "checkbox",
            label:
              "I understand that standard email is not fully encrypted and may not be fully HIPAA-secure. I accept this risk and consent to receiving email communications from this practice.",
            required: true,
          },
          {
            id: "ec_can_revoke",
            type: "checkbox",
            label: "I understand that I can ask my provider to stop sending me emails at any time.",
            required: true,
          },
        ],
      },
      select: { id: true },
    });
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://app.solosuds.com";
  const formLink = `${baseUrl}/intake/${consentForm.id}?clientId=${clientId}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #4f46e5; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">${org?.name ?? "Your Provider"}</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 15px;">Hi ${client.firstName},</p>
        <p style="color: #374151; font-size: 15px;">
          ${org?.name ?? "Your provider"} would like to communicate with you via email. Before we can do that, we need your consent.
        </p>
        <p style="color: #6b7280; font-size: 13px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px;">
          <strong>Note:</strong> Standard email is not fully encrypted and may not be HIPAA-secure. You can choose whether or not to consent.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${formLink}" style="background: #4f46e5; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Review &amp; Sign Consent Form
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">If you have questions, contact your provider directly. You are not required to consent.</p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: client.email,
    subject: `Email Communication Consent — ${org?.name ?? "Your Provider"}`,
    html,
  });

  // Resend SDK returns { data, error } — surface failures before writing to DB
  if ("error" in result && result.error) {
    console.error("[email-consent POST] Resend error:", result.error);
    return NextResponse.json({ error: "Failed to send consent email. Please try again." }, { status: 502 });
  }

  await db.client.update({
    where: { id: clientId },
    data: { emailConsentStatus: EmailConsentStatus.PENDING },
  });

  return NextResponse.json({ ok: true, status: "PENDING" });
}

// DELETE — revoke email consent for this client
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: session.user.organizationId },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  await db.client.update({
    where: { id: clientId },
    data: { emailConsentStatus: EmailConsentStatus.REVOKED },
  });

  return NextResponse.json({ ok: true, status: "REVOKED" });
}
