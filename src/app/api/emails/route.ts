import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("clientId");

  const where: Record<string, unknown> = { organizationId: session.user.organizationId };
  if (clientId) where.clientId = clientId;

  const emails = await db.email.findMany({
    where,
    select: {
      id: true,
      direction: true,
      fromEmail: true,
      toEmail: true,
      subject: true,
      createdAt: true,
      client: { select: { id: true, firstName: true, lastName: true } },
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(emails);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true, logoUrl: true },
  });

  const formData = await request.formData();
  const clientId = formData.get("clientId") as string | null;
  const toEmail = formData.get("toEmail") as string;
  const subject = formData.get("subject") as string;
  const htmlBody = formData.get("htmlBody") as string;

  if (!toEmail || !subject || !htmlBody) {
    return NextResponse.json({ error: "Email, subject, and body are required" }, { status: 400 });
  }
  if (typeof toEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }
  if (typeof subject !== "string" || subject.length > 500) {
    return NextResponse.json({ error: "Subject is too long" }, { status: 400 });
  }

  // Process attachments
  const files = formData.getAll("attachments") as File[];
  const attachmentMeta: Array<{ filename: string; contentType: string; size: number }> = [];
  const resendAttachments: Array<{ filename: string; content: Buffer }> = [];

  for (const file of files) {
    if (!file || !file.name || file.size === 0) continue;
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large: ${file.name} (max 10MB)` }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    resendAttachments.push({ filename: file.name, content: buffer });
    attachmentMeta.push({ filename: file.name, contentType: file.type, size: file.size });
  }

  // Get client name for the template
  let clientName = "";
  if (clientId) {
    const client = await db.client.findUnique({
      where: { id: clientId, organizationId: session.user.organizationId },
      select: { firstName: true, lastName: true },
    });
    if (client) clientName = `${client.firstName} ${client.lastName}`;
  }

  // Wrap in branded email template
  const brandedHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #4f46e5; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">
          ${org?.name || "SoapSuds"}
        </h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        ${clientName ? `<p style="color: #6b7280; margin-top: 0;">Hi ${clientName},</p>` : ""}
        ${htmlBody}
      </div>
      <div style="padding: 16px 32px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Sent via <strong>${org?.name || "SoapSuds"}</strong>
        </p>
      </div>
    </div>
  `;

  try {
    const result = await sendEmail({
      to: toEmail,
      subject,
      html: brandedHtml,
      ...(resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
    });

    const email = await db.email.create({
      data: {
        organizationId: session.user.organizationId,
        senderId: session.user.id,
        clientId: clientId || null,
        direction: "OUTBOUND",
        fromEmail: process.env.FROM_EMAIL || "noreply@soapsuds.app",
        toEmail,
        subject,
        htmlBody,
        attachments: attachmentMeta.length > 0 ? attachmentMeta : undefined,
        resendId: (result as { data?: { id?: string } })?.data?.id || null,
      },
    });

    return NextResponse.json({ id: email.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/emails] Send failed:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
