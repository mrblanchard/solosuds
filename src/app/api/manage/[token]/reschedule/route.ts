import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasConflict, notifyWaitlistForOpening } from "@/lib/scheduling";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { startTime, endTime } = body;

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
  }

  const appointment = await db.appointment.findFirst({
    where: { publicToken: token },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    return NextResponse.json({ error: "This appointment can no longer be rescheduled" }, { status: 400 });
  }

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  const conflict = await hasConflict({
    organizationId: appointment.organizationId,
    practitionerId: appointment.practitionerId,
    startTime: newStart,
    endTime: newEnd,
    excludeAppointmentId: appointment.id,
  });
  if (conflict) {
    return NextResponse.json({ error: "That time is no longer available. Please pick a different time." }, { status: 409 });
  }

  const previousStart = appointment.startTime;

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      startTime: newStart,
      endTime: newEnd,
      reminderSentAt: null, // fresh reminder should fire for the new time
    },
  });

  // The old slot just opened up
  notifyWaitlistForOpening({
    organizationId: appointment.organizationId,
    serviceId: appointment.serviceId,
    openingDate: previousStart,
  }).catch((err) => console.error("[waitlist notify]", err));

  return NextResponse.json({ success: true });
}
