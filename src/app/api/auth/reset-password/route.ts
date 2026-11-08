import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { validatePassword } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { consumeResetToken } from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = (await request.json()) as { token?: unknown; password?: unknown };

    if (!checkRateLimit(`reset:ip:${getClientIp(request)}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts. Please wait a while and try again." }, { status: 429 });
    }

    if (typeof password !== "string") {
      return NextResponse.json({ error: "Please enter a new password." }, { status: 400 });
    }
    // Check the password before using up the token, so a weak password
    // doesn't cost the user their reset link.
    const pwError = validatePassword(password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    const userId = typeof token === "string" ? await consumeResetToken(token) : null;
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link has expired or was already used. Please request a new one.", expired: true },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { hashedPassword: await bcrypt.hash(password, 12) },
      select: { email: true },
    });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    console.error("[POST /api/auth/reset-password]", error);
    return NextResponse.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 });
  }
}
