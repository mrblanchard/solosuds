import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/password-reset";
import { buildBrandedEmail, sendEmail } from "@/lib/email";
import { APP_NAME, SITE_URL } from "@/lib/brand";

// Same response whether or not the email has an account, so this endpoint
// can't be used to find out who is registered.
const OK = { ok: true };

export async function POST(request: NextRequest) {
  try {
    const { email, cfToken } = (await request.json()) as { email?: unknown; cfToken?: unknown };

    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const captchaOk = await verifyTurnstile(typeof cfToken === "string" ? cfToken : null);
    if (!captchaOk) {
      return NextResponse.json(
        { error: "We couldn't complete the security check. Please wait for it to finish, then try again." },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();
    const ip = getClientIp(request);
    if (!checkRateLimit(`forgot:ip:${ip}`, 10, 60 * 60 * 1000) || !checkRateLimit(`forgot:email:${normalized}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many reset requests. Please wait a while and try again." },
        { status: 429 }
      );
    }

    // Emails are stored as typed at sign-up, so match without case.
    const user = await db.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" }, organizationId: { not: null } },
      select: { id: true, email: true, name: true },
    });
    if (!user?.email) return NextResponse.json(OK);

    const token = await createResetToken(user.id);
    const baseUrl = process.env.AUTH_URL ?? SITE_URL;
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const firstName = user.name?.split(" ")[0];

    await sendEmail({
      to: user.email,
      fromName: APP_NAME,
      subject: `Reset your ${APP_NAME} password`,
      html: buildBrandedEmail(
        `<p>Hi${firstName ? ` ${firstName.replace(/[<>&"]/g, "")}` : ""},</p>
<p>Someone asked to reset the password for your ${APP_NAME} account. Click the button below to choose a new one. The link works once and expires in 1 hour.</p>
<p style="margin:28px 0;"><a href="${link}" style="background:#4f46e5;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Choose a new password</a></p>
<p style="font-size:14px;color:#6b7280;">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;">${link}</span></p>
<p style="font-size:14px;color:#6b7280;">If you didn't ask for this, you can ignore this email. Your password won't change.</p>`
      ),
    });

    return NextResponse.json(OK);
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 });
  }
}
