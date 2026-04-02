import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER and ADMIN can modify org settings
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, email, address, website, timezone } = body;

    if (name !== undefined && name.trim() === "") {
      return NextResponse.json({ error: "Organization name cannot be empty" }, { status: 400 });
    }

    const updated = await db.organization.update({
      where: { id: session.user.organizationId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(website !== undefined && { website: website || null }),
        ...(timezone !== undefined && { timezone: timezone || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/settings/organization]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
