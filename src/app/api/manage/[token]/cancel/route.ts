import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyWaitlistForOpening } from "@/lib/scheduling";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const appointment = await db.appointment.findFirst({
    where: { publicToken: token },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appointment.status === "CANCELLED") {
    return NextResponse.json({ error: "This appointment is already cancelled" }, { status: 400 });
  }
  if (appointment.status === "COMPLETED") {
    return NextResponse.json({ error: "This appointment has already happened" }, { status: 400 });
  }

  await db.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  notifyWaitlistForOpening({
    organizationId: appointment.organizationId,
    serviceId: appointment.serviceId,
    openingDate: appointment.startTime,
  }).catch((err) => console.error("[waitlist notify]", err));

  return NextResponse.json({ success: true });
}
