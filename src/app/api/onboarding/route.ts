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

  // Generate a unique slug from the name
  const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const existing = await db.organization.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
  const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${existing.length}`;

  const org = await db.organization.create({
    data: {
      name: name.trim(),
      slug,
    },
  });

  await db.user.update({
    where: { id: session.user.id },
    data: { organizationId: org.id, role: "OWNER" },
  });

  return NextResponse.json({ success: true });
}
