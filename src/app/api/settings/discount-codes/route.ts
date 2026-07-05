import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(["PERCENT", "FIXED"]),
  amount: z.number().int().positive(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const codes = await db.discountCode.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(codes);
}

export async function POST(req: Request) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { code, type, amount, usageLimit, expiresAt } = parsed.data;

  if (type === "PERCENT" && (amount < 1 || amount > 100)) {
    return NextResponse.json({ error: "Percent discounts must be between 1 and 100" }, { status: 400 });
  }

  const normalizedCode = code.trim().toUpperCase();
  const existing = await db.discountCode.findUnique({
    where: { organizationId_code: { organizationId: orgId, code: normalizedCode } },
  });
  if (existing) {
    return NextResponse.json({ error: "A discount code with that name already exists" }, { status: 409 });
  }

  const created = await db.discountCode.create({
    data: {
      organizationId: orgId,
      code: normalizedCode,
      type,
      amount,
      usageLimit: usageLimit ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
