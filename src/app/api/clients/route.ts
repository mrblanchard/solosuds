import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const clientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  referralSource: z.string().optional(),
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
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

  const { tags, dateOfBirth, email, ...data } = parsed.data;

  const client = await db.client.create({
    data: {
      ...data,
      email: email || undefined,
      organizationId: orgId,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      tags: tags?.length
        ? { create: tags.map((name) => ({ name })) }
        : undefined,
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
