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
      toEmail: true,
      subject: true,
      htmlBody: true,
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
