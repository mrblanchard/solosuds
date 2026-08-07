import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sendAppointmentReminder } from "@/lib/email";
import { sendAppointmentSms } from "@/lib/twilio";
import { confirmationSms } from "@/lib/sms-templates";
import { hasConflict, validateBookingWindow } from "@/lib/scheduling";
import { formatDate } from "@/lib/utils";

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

    // Recipient must actively check the SMS consent box on the web form — never inferred from
    // providing a phone number alone. See the SmsConsentMethod enum in schema.prisma.
    const smsOptIn = Boolean(clientPhone) && smsConsent === true;

    // Find or create client
    let client = await db.client.findFirst({
      where: { organizationId: orgId, email: clientEmail },
    });

    if (!client) {
      client = await db.client.create({
        data: {
          organizationId: orgId,
          firstName: clientFirstName,
          lastName: clientLastName,
          email: clientEmail,
          phone: clientPhone ?? null,
          status: "ACTIVE",
          ...(smsOptIn
            ? { smsConsentStatus: "CONSENTED", smsConsentMethod: "WEB_FORM", smsConsentAt: new Date() }
            : {}),
        },
      });
    } else if (smsOptIn && client.smsConsentStatus !== "CONSENTED") {
      // Re-consenting on a later booking upgrades an existing client's status, but a missing
      // checkbox never downgrades or overwrites consent the client already gave elsewhere.
      client = await db.client.update({
        where: { id: client.id },
        data: {
          phone: clientPhone ?? client.phone,
          smsConsentStatus: "CONSENTED",
          smsConsentMethod: "WEB_FORM",
          smsConsentAt: new Date(),
        },
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

    // Send confirmation text — only ever to clients with recorded SMS consent
    if (client.phone && client.smsConsentStatus === "CONSENTED") {
      try {
        const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
        await sendAppointmentSms({
          to: client.phone,
          body: confirmationSms({
            orgName: org.name,
            serviceName: service.name,
            date: formatDate(startTime, "MMM d"),
            time: formatDate(startTime, "h:mm a"),
            link: `${baseUrl}/manage/${appointment.publicToken}`,
          }),
        });
      } catch (err) {
        // Non-fatal — log but don't reject
        console.warn("Failed to send booking confirmation SMS:", err);
      }
    }

    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/book]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
