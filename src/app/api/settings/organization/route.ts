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
    const { name, phone, email, address, website, timezone, practiceType, noteType, defaultIntakeFormId, primaryColor, logoUrl, faviconUrl, brandFont, emailSignature } = body;

    if (name !== undefined && name.trim() === "") {
      return NextResponse.json({ error: "Organization name cannot be empty" }, { status: 400 });
    }
    if (name !== undefined && name.length > 200) {
      return NextResponse.json({ error: "Organization name is too long" }, { status: 400 });
    }
    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (phone !== undefined && phone && !/^[+]?[\d\s()-]{7,20}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (primaryColor !== undefined && primaryColor && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor)) {
      return NextResponse.json({ error: "Invalid color — use a hex value like #5a4f8a" }, { status: 400 });
    }

    const validPracticeTypes = ["THERAPY", "SALON", "MEDICAL", "FITNESS", "OTHER"];
    if (practiceType !== undefined && !validPracticeTypes.includes(practiceType)) {
      return NextResponse.json({ error: "Invalid practice type" }, { status: 400 });
    }

    if (noteType !== undefined && noteType !== "SOAP" && noteType !== "SESSION") {
      return NextResponse.json({ error: "Invalid note type" }, { status: 400 });
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
        ...(practiceType !== undefined && { practiceType }),
        ...(noteType !== undefined && { noteType }),
        ...(defaultIntakeFormId !== undefined && { defaultIntakeFormId: defaultIntakeFormId || null }),
        ...(primaryColor !== undefined && { primaryColor: primaryColor || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(faviconUrl !== undefined && { faviconUrl: faviconUrl || null }),
        ...(brandFont !== undefined && { brandFont: brandFont || null }),
        ...(emailSignature !== undefined && { emailSignature: emailSignature || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/settings/organization]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
