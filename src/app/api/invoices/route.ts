import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { stripe } from "@/lib/stripe";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().positive(), // cents
  cptCode: z.string().optional(),
});

const invoiceSchema = z.object({
  clientId: z.string(),
  appointmentId: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  tax: z.number().int().default(0),
  discountCode: z.string().max(50).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const parsed = invoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { lineItems, dueDate, tax, discountCode, ...data } = parsed.data;

  const client = await db.client.findFirst({
    where: { id: data.clientId, organizationId: orgId },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const enrichedItems = lineItems.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));

  const subtotal = enrichedItems.reduce((sum, item) => sum + item.total, 0);

  let discountCodeId: string | undefined;
  let discountAmount = 0;

  if (discountCode?.trim()) {
    const code = await db.discountCode.findUnique({
      where: { organizationId_code: { organizationId: orgId, code: discountCode.trim().toUpperCase() } },
    });
    if (!code || !code.active) {
      return NextResponse.json({ error: "Invalid or inactive discount code" }, { status: 400 });
    }
    if (code.expiresAt && code.expiresAt < new Date()) {
      return NextResponse.json({ error: "This discount code has expired" }, { status: 400 });
    }

    discountCodeId = code.id;
    discountAmount = code.type === "PERCENT"
      ? Math.round(subtotal * (code.amount / 100))
      : code.amount;
    discountAmount = Math.min(discountAmount, subtotal); // never discount below $0 subtotal

    // Claim the usage slot atomically (conditioned on the DB's current count,
    // not the stale read above) so two concurrent requests can't both redeem
    // the last use of a limited code. If invoice creation fails after this,
    // the slot is spent without an invoice to show for it — an acceptable
    // failure direction (under-counts availability rather than over-redeeming).
    if (code.usageLimit != null) {
      const claim = await db.discountCode.updateMany({
        where: { id: code.id, usageCount: { lt: code.usageLimit } },
        data: { usageCount: { increment: 1 } },
      });
      if (claim.count === 0) {
        return NextResponse.json({ error: "This discount code has reached its usage limit" }, { status: 400 });
      }
    } else {
      await db.discountCode.update({ where: { id: code.id }, data: { usageCount: { increment: 1 } } });
    }
  }

  const total = subtotal + tax - discountAmount;

  // Generate invoice number
  const count = await db.invoice.count({ where: { organizationId: orgId } });
  const number = String(count + 1).padStart(5, "0");

  const invoice = await db.invoice.create({
    data: {
      ...data,
      organizationId: orgId,
      number,
      subtotal,
      tax,
      discountCodeId,
      discountAmount,
      total,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lineItems: enrichedItems as never,
      status: "DRAFT",
      publicToken: crypto.randomBytes(16).toString("hex"),
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
