import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orgSlug, contact, cfToken } = body as { orgSlug?: string; contact?: string; cfToken?: string };

  if (!orgSlug || !contact) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const captchaOk = await verifyTurnstile(cfToken);
  if (!captchaOk) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
  }

  const normalized = contact.trim().toLowerCase();

  // Throttle how often a code can be requested for a given account / IP.
  const ip = getClientIp(request);
  const accountKey = `portal-request:${orgSlug}:${normalized}`;
  const ipKey = `portal-request-ip:${ip}`;
  if (!checkRateLimit(accountKey, 3, 15 * 60 * 1000) || !checkRateLimit(ipKey, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true },
  });
  if (!org) {
    // Return same response to avoid org enumeration
    return NextResponse.json({ ok: true });
  }

  const client = await db.client.findFirst({
    where: {
      organizationId: org.id,
      OR: [
        { email: normalized },
        // phone stored normalized — match either format
        { phone: contact.trim() },
        { phone: normalized },
      ],
    },
    select: { id: true, firstName: true, email: true, phone: true },
  });

  if (!client) {
    // Same response regardless — don't reveal whether client exists
    return NextResponse.json({ ok: true });
  }

  const code = generateOTP();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  // Remove any prior unused OTPs for this client
  await db.clientPortalOTP.deleteMany({ where: { clientId: client.id, used: false } });

  await db.clientPortalOTP.create({
    data: { clientId: client.id, orgId: org.id, codeHash, expiresAt },
  });

  const deliveryMethod = client.email && normalized === client.email.toLowerCase() ? "email" : "phone";

  if (deliveryMethod === "email" && client.email) {
    const result = await sendEmail({
      to: client.email,
      subject: `Your ${org.name} portal access code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background: #4f46e5; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">${org.name}</h1>
          </div>
          <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color: #374151; font-size: 15px;">Hi ${client.firstName},</p>
            <p style="color: #374151; font-size: 15px;">Your one-time access code for the client portal is:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${code}</span>
            </div>
            <p style="color: #6b7280; font-size: 13px;">This code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: "Failed to send code. Please try again." }, { status: 502 });
    }
  } else {
    // TODO: SMS via Twilio when phone is matched
    // For now fall back — in practice you'd send via twilio.ts here
  }

  return NextResponse.json({ ok: true, method: deliveryMethod });
}
