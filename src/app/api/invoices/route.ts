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

  const { lineItems, dueDate, tax, ...data } = parsed.data;

  const client = await db.client.findFirst({
    where: { id: data.clientId, organizationId: orgId },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const enrichedItems = lineItems.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));

  const subtotal = enrichedItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal + tax;

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
      total,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lineItems: enrichedItems as never,
      status: "DRAFT",
      publicToken: crypto.randomBytes(16).toString("hex"),
    },
  });

  return NextResponse.json(invoice, { status: 201 });
}
