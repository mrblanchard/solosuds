import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { inviteCode: code },
    select: { name: true, inviteCodeExpiresAt: true },
  });

  if (!org || (org.inviteCodeExpiresAt && org.inviteCodeExpiresAt < new Date())) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  return NextResponse.json({ organizationName: org.name });
}
