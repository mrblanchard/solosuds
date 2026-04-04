import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validatePassword } from "@/lib/utils";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, currentPassword, newPassword, smsForwardNumber, theme } = body;

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      }
      if (!user.password) {
        return NextResponse.json({ error: "Cannot set password for OAuth accounts" }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      const pwError = validatePassword(newPassword);
      if (pwError) {
        return NextResponse.json({ error: pwError }, { status: 400 });
      }
    }

    const hashedPassword = newPassword ? await bcrypt.hash(newPassword, 12) : undefined;

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(hashedPassword !== undefined && { password: hashedPassword }),
        ...(smsForwardNumber !== undefined && { smsForwardNumber: smsForwardNumber || null }),
        ...(theme !== undefined && { theme }),
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/settings/profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
