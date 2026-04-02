import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationName, name, email, password } = body;

    if (!organizationName || !name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if email already registered
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create org + owner user in a transaction
    const user = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
      // Generate a unique slug from the org name
      const baseSlug = organizationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existing = await tx.organization.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
      const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${existing.length}`;

      const org = await tx.organization.create({
        data: { name: organizationName, slug },
      });

      return tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
          role: "OWNER",
          organizationId: org.id,
        },
      });
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
