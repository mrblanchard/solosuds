import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true },
  });
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role } = body;

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
  }

  const allowedRoles = ["ADMIN", "PRACTITIONER", "FRONT_DESK"];
  const inviteRole = allowedRoles.includes(role) ? role : "PRACTITIONER";

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true, inviteCode: true },
  });

  if (!org?.inviteCode) {
    return NextResponse.json({ error: "No invite link has been generated yet" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || request.nextUrl.origin;
  const inviteUrl = `${origin}/register?invite=${org.inviteCode}&role=${inviteRole}`;

  try {
    const result = await sendEmail({
      to: email,
      subject: `You're invited to join ${org.name} on SoapSuds`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1f2937;">You're invited!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${user.name || "A team member"}</strong> has invited you to join
            <strong>${org.name}</strong> on SoapSuds.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Click the button below to create your account and get started:
          </p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Join ${org.name}
            </a>
          </p>
          <p style="color: #9ca3af; font-size: 13px;">
            Or copy this link: ${inviteUrl}
          </p>
        </div>
      `,
    });
    console.log("[invite-email] Resend result:", JSON.stringify(result));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invite-email] Send failed:", err);
    return NextResponse.json({ error: "Failed to send email. Check Resend configuration." }, { status: 500 });
  }
}
