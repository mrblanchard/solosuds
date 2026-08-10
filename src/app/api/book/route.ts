import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sendAppointmentReminder } from "@/lib/email";
import { hasConflict, validateBookingWindow } from "@/lib/scheduling";
import { sendSms } from "@/lib/twilio";

const SMS_OPT_IN_CONFIRMATION =
  "SoloSuds: You are now opted in to receive appointment text notifications. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId,
      serviceId,
      startTime,
      endTime,
      clientFirstName,
      clientLastName,
      clientEmail,
      clientPhone,
      smsConsent,
      notes,
    } = body;

    if (!orgId || !serviceId || !startTime || !endTime || !clientFirstName || !clientLastName || !clientEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof clientFirstName !== "string" || clientFirstName.length > 100) {
      return NextResponse.json({ error: "Invalid first name" }, { status: 400 });
    }
    if (typeof clientLastName !== "string" || clientLastName.length > 100) {
      return NextResponse.json({ error: "Invalid last name" }, { status: 400 });
    }
    if (typeof clientEmail !== "string" || clientEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (clientPhone && (typeof clientPhone !== "string" || !/^[+]?[\d\s()-]{7,20}$/.test(clientPhone))) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (smsConsent && !clientPhone) {
      return NextResponse.json({ error: "A phone number is required to opt in to text messages" }, { status: 400 });
    }
    if (notes && (typeof notes !== "string" || notes.length > 5000)) {
      return NextResponse.json({ error: "Notes are too long" }, { status: 400 });
    }

    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const service = await db.service.findFirst({
      where: { id: serviceId, organizationId: orgId, isActive: true },
    });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const windowCheck = await validateBookingWindow({
      organizationId: orgId,
      startTime: new Date(startTime),
    });
    if (!windowCheck.ok) {
      return NextResponse.json({ error: windowCheck.error }, { status: 409 });
    }

    const conflict = await hasConflict({
      organizationId: orgId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });
    if (conflict) {
      return NextResponse.json(
        { error: "That time is no longer available. Please pick a different time." },
        { status: 409 }
      );
    }

    // Find or create client
    let client = await db.client.findFirst({
      where: { organizationId: orgId, email: clientEmail },
    });

    // Only true when this request is the moment the client first opts in, so we
    // don't re-send the opt-in confirmation on every subsequent booking.
    let newlyOptedIntoSms = false;

    if (!client) {
      newlyOptedIntoSms = !!(smsConsent && clientPhone);
      client = await db.client.create({
        data: {
          organizationId: orgId,
          firstName: clientFirstName,
          lastName: clientLastName,
          email: clientEmail,
          phone: clientPhone ?? null,
          status: "ACTIVE",
          smsConsentedAt: newlyOptedIntoSms ? new Date() : null,
        },
      });
    } else if (smsConsent && clientPhone && !client.smsConsentedAt) {
      newlyOptedIntoSms = true;
      client = await db.client.update({
        where: { id: client.id },
        data: { phone: clientPhone, smsConsentedAt: new Date() },
      });
    }

    const appointment = await db.appointment.create({
      data: {
        organizationId: orgId,
        clientId: client.id,
        serviceId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: "SCHEDULED",
        notes: notes ?? null,
        publicToken: randomUUID(),
      },
    });

    // Send confirmation email
    if (clientEmail) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
        await sendAppointmentReminder({
          to: clientEmail,
          clientName: `${clientFirstName} ${clientLastName}`,
          practitionerName: org.name,
          appointmentDate: new Date(startTime).toLocaleDateString(),
          appointmentTime: new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          serviceName: service.name,
          startDateTime: startTime,
          endDateTime: endTime,
          manageUrl: `${baseUrl}/manage/${appointment.publicToken}`,
          kind: "confirmation",
        });
      } catch {
        // Non-fatal — log but don't reject
        console.warn("Failed to send booking confirmation email");
      }
    }

    // Send the one-time SMS opt-in confirmation the moment a client consents.
    if (newlyOptedIntoSms && client.phone) {
      try {
        await sendSms({ to: client.phone, body: SMS_OPT_IN_CONFIRMATION });
      } catch (err) {
        console.warn("Failed to send SMS opt-in confirmation:", err);
      }
    }

    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/book]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
