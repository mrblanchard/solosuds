import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });

  const discountCode = await db.discountCode.findUnique({
    where: { organizationId_code: { organizationId: orgId, code } },
  });

  if (!discountCode || !discountCode.active) {
    return NextResponse.json({ valid: false, error: "Invalid or inactive code" });
  }
  if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: "This code has expired" });
  }
  if (discountCode.usageLimit != null && discountCode.usageCount >= discountCode.usageLimit) {
    return NextResponse.json({ valid: false, error: "This code has reached its usage limit" });
  }

  return NextResponse.json({ valid: true, type: discountCode.type, amount: discountCode.amount });
}
