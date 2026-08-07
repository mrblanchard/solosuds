import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalPhone = z.string().regex(/^[+]?[\d\s()-]{7,20}$/, "Invalid phone number").or(z.literal("")).optional();

const clientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(254).optional().or(z.literal("")),
  phone: optionalPhone,
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  gender: z.string().max(50).optional(),
  pronouns: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().regex(/^[A-Za-z0-9\s-]{3,10}$/).or(z.literal("")).optional(),
  country: z.string().max(100).optional(),
  emergencyName: z.string().max(200).optional(),
  emergencyPhone: optionalPhone,
  referralSource: z.string().max(200).optional(),
  internalNotes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  smsConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { tags, dateOfBirth, email, smsConsent, ...data } = parsed.data;

  // Practitioner must actively check the verbal-consent box — never inferred from a phone number alone.
  const smsOptIn = Boolean(data.phone) && smsConsent === true;

  const client = await db.client.create({
    data: {
      ...data,
      email: email || undefined,
      organizationId: orgId,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      tags: tags?.length
        ? { create: tags.map((name) => ({ name })) }
        : undefined,
      ...(smsOptIn
        ? { smsConsentStatus: "CONSENTED", smsConsentMethod: "VERBAL", smsConsentAt: new Date() }
        : {}),
    },
  });

  return NextResponse.json(client, { status: 201 });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const clients = await db.client.findMany({
    where: {
      organizationId: orgId,
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
  });

  return NextResponse.json(clients);
}
