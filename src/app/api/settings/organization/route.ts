import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizeEmailHtml } from "@/lib/sanitize";

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
    const { name, phone, email, address, website, timezone, practiceType, noteType, defaultIntakeFormId, primaryColor, logoUrl, faviconUrl, brandFont, emailSignature, replyToEmail, venmoHandle, cashAppHandle, paypalHandle, squareHandle, zelleHandle, bookingStartHour, bookingEndHour, bookingDays, bookingSlotMinutes, maxDailyAppointments } = body;

    if (name !== undefined && name.trim() === "") {
      return NextResponse.json({ error: "Organization name cannot be empty" }, { status: 400 });
    }
    if (name !== undefined && name.length > 200) {
      return NextResponse.json({ error: "Organization name is too long" }, { status: 400 });
    }
    if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (replyToEmail !== undefined && replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
      return NextResponse.json({ error: "Invalid reply-to email address" }, { status: 400 });
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

    if (bookingStartHour !== undefined && (!Number.isInteger(bookingStartHour) || bookingStartHour < 0 || bookingStartHour > 23)) {
      return NextResponse.json({ error: "Invalid booking start hour" }, { status: 400 });
    }
    if (bookingEndHour !== undefined && (!Number.isInteger(bookingEndHour) || bookingEndHour < 1 || bookingEndHour > 24)) {
      return NextResponse.json({ error: "Invalid booking end hour" }, { status: 400 });
    }
    if (bookingStartHour !== undefined || bookingEndHour !== undefined) {
      // Cross-validate against whichever value isn't part of this request, so a
      // partial update (only start or only end) can't silently invert the window.
      const current = await db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { bookingStartHour: true, bookingEndHour: true },
      });
      const effectiveStart = bookingStartHour !== undefined ? bookingStartHour : current?.bookingStartHour ?? 0;
      const effectiveEnd = bookingEndHour !== undefined ? bookingEndHour : current?.bookingEndHour ?? 24;
      if (effectiveStart >= effectiveEnd) {
        return NextResponse.json({ error: "Booking start hour must be before end hour" }, { status: 400 });
      }
    }
    if (bookingDays !== undefined && (!Array.isArray(bookingDays) || bookingDays.some((d: unknown) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6))) {
      return NextResponse.json({ error: "Invalid booking days" }, { status: 400 });
    }
    if (bookingSlotMinutes !== undefined && (!Number.isInteger(bookingSlotMinutes) || bookingSlotMinutes < 5 || bookingSlotMinutes > 240)) {
      return NextResponse.json({ error: "Invalid slot interval" }, { status: 400 });
    }
    if (maxDailyAppointments !== undefined && maxDailyAppointments !== null && (!Number.isInteger(maxDailyAppointments) || maxDailyAppointments < 1)) {
      return NextResponse.json({ error: "Invalid max daily appointments" }, { status: 400 });
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
        ...(emailSignature !== undefined && { emailSignature: emailSignature ? sanitizeEmailHtml(emailSignature) : null }),
        ...(replyToEmail !== undefined && { replyToEmail: replyToEmail || null }),
        ...(venmoHandle !== undefined && { venmoHandle: venmoHandle ? venmoHandle.trim().replace(/^@/, "") : null }),
        ...(cashAppHandle !== undefined && { cashAppHandle: cashAppHandle ? cashAppHandle.trim().replace(/^\$/, "") : null }),
        ...(paypalHandle !== undefined && { paypalHandle: paypalHandle ? paypalHandle.trim() : null }),
        ...(squareHandle !== undefined && { squareHandle: squareHandle ? squareHandle.trim() : null }),
        ...(zelleHandle !== undefined && { zelleHandle: zelleHandle ? zelleHandle.trim() : null }),
        ...(bookingStartHour !== undefined && { bookingStartHour }),
        ...(bookingEndHour !== undefined && { bookingEndHour }),
        ...(bookingDays !== undefined && { bookingDays }),
        ...(bookingSlotMinutes !== undefined && { bookingSlotMinutes }),
        ...(maxDailyAppointments !== undefined && { maxDailyAppointments }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/settings/organization]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
