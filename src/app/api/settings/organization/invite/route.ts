import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { INVITE_CODE_TTL_MS } from "@/lib/utils";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inviteCode = crypto.randomBytes(16).toString("hex");
  const inviteCodeExpiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS);

  await db.organization.update({
    where: { id: session.user.organizationId },
    data: { inviteCode, inviteCodeExpiresAt },
  });

  return NextResponse.json({ inviteCode, inviteCodeExpiresAt });
}
