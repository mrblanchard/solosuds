import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendAppointmentReminder } from "@/lib/email";

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

    const owner = await db.user.findFirst({
      where: { organizationId: orgId, role: "OWNER" },
      select: { id: true },
    });
    if (!owner) return NextResponse.json({ error: "Organization has no owner" }, { status: 404 });

    const service = await db.service.findFirst({
      where: { id: serviceId, organizationId: orgId, isActive: true },
    });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

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
        },
      });
    }

    const appointment = await db.appointment.create({
      data: {
        organizationId: orgId,
        clientId: client.id,
        serviceId,
        practitionerId: owner.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: "SCHEDULED",
        notes: notes ?? null,
      },
    });

    // Send confirmation email
    if (clientEmail) {
      try {
        await sendAppointmentReminder({
          to: clientEmail,
          clientName: `${clientFirstName} ${clientLastName}`,
          practitionerName: org.name,
          appointmentDate: new Date(startTime).toLocaleDateString(),
          appointmentTime: new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          serviceName: service.name,
          startDateTime: startTime,
          endDateTime: endTime,
        });
      } catch {
        // Non-fatal — log but don't reject
        console.warn("Failed to send booking confirmation email");
      }
    }

    return NextResponse.json({ appointmentId: appointment.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/book]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
