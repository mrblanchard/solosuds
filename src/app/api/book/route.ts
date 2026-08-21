import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sendAppointmentReminder } from "@/lib/email";
import { hasConflict, validateBookingWindow } from "@/lib/scheduling";
import { sendSms, buildAppointmentConfirmationSms } from "@/lib/twilio";
import { zonedTimeToUtc, formatZonedDisplay } from "@/lib/timezone";

const SMS_OPT_IN_CONFIRMATION =
  "SoloSuds: You are now opted in to receive appointment text notifications. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId,
      serviceId,
      date,
      time,
      clientFirstName,
      clientLastName,
      clientEmail,
      clientPhone,
      smsConsent,
      notes,
    } = body;

    if (!orgId || !serviceId || !date || !time || !clientFirstName || !clientLastName || !clientEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return NextResponse.json({ error: "Invalid time" }, { status: 400 });
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

    // Derive the actual instant server-side from the org's own timezone,
    // rather than trusting a client-computed timestamp — a browser building
    // `new Date(`${date}T${time}`)` interprets it in ITS OWN local timezone,
    // which silently drifts from what the availability endpoint (also
    // anchored to org.timezone) considered "in business hours."
    const [hh, mm] = time.split(":").map(Number);
    const startTime = zonedTimeToUtc(date, hh, mm, org.timezone);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);

    const windowCheck = await validateBookingWindow({
      organizationId: orgId,
      startTime,
    });
    if (!windowCheck.ok) {
      return NextResponse.json({ error: windowCheck.error }, { status: 409 });
    }

    const conflict = await hasConflict({
      organizationId: orgId,
      startTime,
      endTime,
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
        startTime,
        endTime,
        status: "SCHEDULED",
        notes: notes ?? null,
        publicToken: randomUUID(),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
    const manageUrl = `${baseUrl}/manage/${appointment.publicToken}`;
    const zonedDisplay = formatZonedDisplay(startTime, org.timezone);

    // Send confirmation email
    if (clientEmail) {
      try {
        await sendAppointmentReminder({
          to: clientEmail,
          clientName: `${clientFirstName} ${clientLastName}`,
          practitionerName: org.name,
          appointmentDate: zonedDisplay.dateStr,
          appointmentTime: zonedDisplay.timeStr,
          serviceName: service.name,
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString(),
          manageUrl,
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
    } else if (client.phone && client.smsConsentedAt) {
      // Client was already opted in from a previous booking — send the
      // booking confirmation text (the opt-in confirmation above already
      // covers this booking for a brand-new opt-in, so this branch only
      // fires for a returning, already-consented client).
      try {
        await sendSms({
          to: client.phone,
          body: buildAppointmentConfirmationSms({
            serviceName: service.name,
            startTime,
            manageUrl,
          }),
        });
      } catch (err) {
        console.warn("Failed to send booking confirmation SMS:", err);
      }
    }

    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/book]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
