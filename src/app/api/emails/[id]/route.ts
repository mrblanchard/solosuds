import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const email = await db.email.findUnique({
    where: { id, organizationId: session.user.organizationId },
    select: {
      id: true,
      direction: true,
      fromEmail: true,
      toEmail: true,
      subject: true,
      htmlBody: true,
      textBody: true,
      attachments: true,
      createdAt: true,
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
      sender: { select: { id: true, name: true } },
    },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  return NextResponse.json(email);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { archived } = body;

  if (typeof archived !== "boolean") {
    return NextResponse.json({ error: "archived must be a boolean" }, { status: 400 });
  }

  const email = await db.email.findUnique({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const updated = await db.email.update({
    where: { id },
    data: { archived },
    select: { id: true, archived: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const email = await db.email.findUnique({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true },
  });

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  await db.email.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

