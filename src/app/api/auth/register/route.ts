import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { validatePassword } from "@/lib/utils";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationName, name, email, password, fromGoogle, inviteCode, role: requestedRole, cfToken } = body;

    // Verify CAPTCHA for non-Google credential registrations
    if (!fromGoogle) {
      const captchaOk = await verifyTurnstile(cfToken);
      if (!captchaOk) {
        return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
      }
    }

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    if (!inviteCode && !organizationName) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    if (typeof organizationName !== "string" || organizationName.length > 200) {
      return NextResponse.json({ error: "Organization name is too long" }, { status: 400 });
    }
    if (typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!fromGoogle && !password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (!fromGoogle && password) {
      const pwError = validatePassword(password);
      if (pwError) {
        return NextResponse.json({ error: pwError }, { status: 400 });
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;

    // Check if a user already exists (e.g. pre-created by Google OAuth flow).
    // If they have no org yet, we update them. If they already have an org, reject.
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true, organizationId: true },
    });
    if (existingUser?.organizationId) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Create org + owner user in a transaction
    const user = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
      // If registering with an invite code, join existing org
      if (inviteCode) {
        const org = await tx.organization.findUnique({ where: { inviteCode } });
        if (!org) {
          throw new Error("INVALID_INVITE");
        }

        const allowedRoles = ["ADMIN", "PRACTITIONER", "FRONT_DESK"] as const;
        const inviteRole = allowedRoles.includes(requestedRole) ? requestedRole : "PRACTITIONER";

        if (existingUser) {
          return tx.user.update({
            where: { id: existingUser.id },
            data: { name, organizationId: org.id, role: inviteRole, ...(hashedPassword ? { hashedPassword } : {}) },
          });
        }

        return tx.user.create({
          data: {
            name,
            email,
            hashedPassword,
            role: inviteRole,
            organizationId: org.id,
          },
        });
      }

      // Otherwise create a new org
      // Generate a unique slug from the org name
      const baseSlug = organizationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const slugCheck = await tx.organization.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
      const slug = slugCheck.length === 0 ? baseSlug : `${baseSlug}-${slugCheck.length}`;

      const code = crypto.randomBytes(16).toString("hex");
      const org = await tx.organization.create({
        data: { name: organizationName, slug, inviteCode: code },
      });

      if (existingUser) {
        // User was pre-created by Google OAuth — update them with org and name
        return tx.user.update({
          where: { id: existingUser.id },
          data: { name, organizationId: org.id, role: "OWNER", ...(hashedPassword ? { hashedPassword } : {}) },
        });
      }

      return tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
          role: "OWNER",
          organizationId: org.id,
        },
      });
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INVITE") {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 400 });
    }
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
