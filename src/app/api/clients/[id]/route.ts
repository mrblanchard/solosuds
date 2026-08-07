import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const client = await db.client.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      pronouns,
      address,
      city,
      state,
      zip,
      country,
      emergencyName,
      emergencyPhone,
      referralSource,
      internalNotes,
      status,
      smsConsent,
    } = body;

    // Practitioner must actively toggle the verbal-consent checkbox — checking it records a fresh
    // verbal opt-in, unchecking it (only meaningful if the client was previously consented) records
    // a revocation. Leaving it untouched (smsConsent undefined) never changes consent on file.
    const nextPhone = phone !== undefined ? phone || null : client.phone;
    let consentUpdate: Record<string, unknown> = {};
    if (smsConsent === true && Boolean(nextPhone) && client.smsConsentStatus !== "CONSENTED") {
      consentUpdate = { smsConsentStatus: "CONSENTED", smsConsentMethod: "VERBAL", smsConsentAt: new Date() };
    } else if (smsConsent === false && client.smsConsentStatus === "CONSENTED") {
      consentUpdate = { smsConsentStatus: "REVOKED" };
    }

    const updated = await db.client.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(gender !== undefined && { gender: gender || null }),
        ...(pronouns !== undefined && { pronouns: pronouns || null }),
        ...(address !== undefined && { address: address || null }),
        ...(city !== undefined && { city: city || null }),
        ...(state !== undefined && { state: state || null }),
        ...(zip !== undefined && { zip: zip || null }),
        ...(country !== undefined && { country: country || null }),
        ...(emergencyName !== undefined && { emergencyName: emergencyName || null }),
        ...(emergencyPhone !== undefined && { emergencyPhone: emergencyPhone || null }),
        ...(referralSource !== undefined && { referralSource: referralSource || null }),
        ...(internalNotes !== undefined && { internalNotes: internalNotes || null }),
        ...(status !== undefined && { status }),
        ...consentUpdate,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/clients/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (user?.role === "PRACTITIONER" || user?.role === "FRONT_DESK") {
      return NextResponse.json({ error: "You do not have permission to delete" }, { status: 403 });
    }

    const client = await db.client.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const permanent = request.nextUrl.searchParams.get("permanent") === "true";

    if (permanent) {
      // Hard delete — remove related records then the client in a transaction
      // Protected (consent) submissions are nullified rather than deleted — they are permanent records
      await db.intakeSubmission.updateMany({
        where: { clientId: id, isProtected: true },
        data: { clientId: null },
      });
      await db.$transaction([
        db.clientTag.deleteMany({ where: { clientId: id } }),
        db.soapNote.deleteMany({ where: { clientId: id } }),
        db.appointment.deleteMany({ where: { clientId: id } }),
        db.intakeSubmission.deleteMany({ where: { clientId: id, isProtected: false } }),
        db.invoice.deleteMany({ where: { clientId: id } }),
        db.message.deleteMany({ where: { clientId: id } }),
        db.email.deleteMany({ where: { clientId: id } }),
        db.client.delete({ where: { id } }),
      ]);
      return NextResponse.json({ deleted: true });
    }

    // Soft-archive instead of hard delete to preserve data integrity
    const updated = await db.client.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[DELETE /api/clients/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await db.client.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("[GET /api/clients/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
