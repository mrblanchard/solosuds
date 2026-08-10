import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

const SMS_OPT_IN_CONFIRMATION =
  "SoloSuds: You are now opted in to receive appointment text notifications. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, serviceId, firstName, lastName, email, phone, smsConsent, preferredDate, notes } = body;

    if (!orgId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof firstName !== "string" || firstName.length > 100) {
      return NextResponse.json({ error: "Invalid first name" }, { status: 400 });
    }
    if (typeof lastName !== "string" || lastName.length > 100) {
      return NextResponse.json({ error: "Invalid last name" }, { status: 400 });
    }
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (phone && (typeof phone !== "string" || !/^[+]?[\d\s()-]{7,20}$/.test(phone))) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (smsConsent && !phone) {
      return NextResponse.json({ error: "A phone number is required to opt in to text messages" }, { status: 400 });
    }
    if (notes && (typeof notes !== "string" || notes.length > 1000)) {
      return NextResponse.json({ error: "Notes are too long" }, { status: 400 });
    }

    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const entry = await db.waitlistEntry.create({
      data: {
        organizationId: orgId,
        serviceId: serviceId || undefined,
        clientFirstName: firstName,
        clientLastName: lastName,
        clientEmail: email,
        clientPhone: phone || null,
        smsConsentedAt: smsConsent && phone ? new Date() : null,
        // Bare "YYYY-MM-DD" strings parse as UTC midnight per the JS spec, but the
        // rest of this codebase treats date-only strings as local time — append a
        // time component so this stays consistent with how dayStart/dayEnd are
        // computed in notifyWaitlistForOpening.
        preferredDate: preferredDate ? new Date(`${preferredDate}T00:00:00`) : null,
        notes: notes || null,
      },
    });

    if (smsConsent && phone) {
      try {
        await sendSms({ to: phone, body: SMS_OPT_IN_CONFIRMATION });
      } catch (err) {
        console.warn("Failed to send SMS opt-in confirmation:", err);
      }
    }

    return NextResponse.json({ waitlistEntryId: entry.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/book/waitlist]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
