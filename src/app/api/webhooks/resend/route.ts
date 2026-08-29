import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { Webhook, WebhookVerificationError } from "svix";
import { db } from "@/lib/db";
import { sanitizeEmailHtml } from "@/lib/sanitize";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

// Resend inbound email webhook
// Docs: https://resend.com/docs/webhooks/emails/received
// Resend signs webhook deliveries via Svix — verify before trusting the payload.
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Resend webhook] RESEND_WEBHOOK_SECRET is not configured — rejecting");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let payload: Record<string, unknown>;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, svixHeaders) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error("[Resend webhook] Signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType = payload.type as string;

  // Only handle inbound emails
  if (eventType !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  const data = payload.data as {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };

  if (!data?.email_id) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  try {
    // Fetch the full email content from Resend
    const { data: fullEmail, error } = await resend.emails.receiving.get(data.email_id);
    if (error || !fullEmail) {
      console.error("[Resend webhook] Failed to fetch email:", error);
      return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 });
    }

    // Extract sender email (format: "Name <email@domain.com>" or just "email@domain.com")
    const fromRaw = (fullEmail as unknown as Record<string, unknown>).from as string || data.from;
    const fromMatch = fromRaw.match(/<([^>]+)>/) || [null, fromRaw];
    const fromEmail = (fromMatch[1] || fromRaw).trim().toLowerCase();

    const subject = (fullEmail as unknown as Record<string, unknown>).subject as string || data.subject || "(No subject)";
    const rawHtmlBody = (fullEmail as unknown as Record<string, unknown>).html as string || "";
    const htmlBody = rawHtmlBody ? sanitizeEmailHtml(rawHtmlBody) : "";
    const textBody = (fullEmail as unknown as Record<string, unknown>).text as string || "";

    // Try to match sender to a client by email
    const client = await db.client.findFirst({
      where: { email: { equals: fromEmail, mode: "insensitive" } },
      select: { id: true, organizationId: true },
    });

    if (!client) {
      // Can't match to any org — log and discard
      console.log(`[Resend webhook] No client found for sender: ${fromEmail}`);
      return NextResponse.json({ ok: true, matched: false });
    }

    // Extract attachment metadata
    const rawAttachments = (fullEmail as unknown as Record<string, unknown>).attachments as Array<{
      id: string;
      filename: string;
      content_type: string;
    }> | undefined;

    const attachmentMeta = rawAttachments?.map((a) => ({
      filename: a.filename,
      contentType: a.content_type,
      resendAttachmentId: a.id,
    }));

    // Store the inbound email
    await db.email.create({
      data: {
        organizationId: client.organizationId,
        clientId: client.id,
        direction: "INBOUND",
        fromEmail,
        toEmail: Array.isArray(data.to) ? data.to[0] : String(data.to),
        subject,
        htmlBody: htmlBody || textBody || "",
        textBody: textBody || null,
        attachments: attachmentMeta && attachmentMeta.length > 0 ? attachmentMeta : undefined,
        resendId: data.email_id,
      },
    });

    return NextResponse.json({ ok: true, matched: true });
  } catch (err) {
    console.error("[Resend webhook] Error processing inbound email:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
