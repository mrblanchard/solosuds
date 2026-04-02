import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.organizationId) {
    return NextResponse.json({ error: "Organization already exists" }, { status: 400 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Practice name is required" }, { status: 400 });
  }

  const org = await db.organization.create({
    data: {
      name: name.trim(),
      ownerId: session.user.id,
    },
  });

  await db.user.update({
    where: { id: session.user.id },
    data: { organizationId: org.id, role: "OWNER" },
  });

  return NextResponse.json({ success: true });
}
