import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyWaitlistForOpening } from "@/lib/scheduling";

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
    const { status, notes } = body;

    const appointment = await db.appointment.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.appointment.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    if (status === "CANCELLED" && appointment.status !== "CANCELLED") {
      notifyWaitlistForOpening({
        organizationId: session.user.organizationId,
        serviceId: appointment.serviceId,
        openingDate: appointment.startTime,
      }).catch((err) => console.error("[waitlist notify]", err));
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/appointments/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const delUser = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (delUser?.role === "PRACTITIONER" || delUser?.role === "FRONT_DESK") {
      return NextResponse.json({ error: "You do not have permission to delete" }, { status: 403 });
    }

    const appointment = await db.appointment.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.appointment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/appointments/:id]", error);
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

    const appointment = await db.appointment.findFirst({
      where: { id, organizationId: session.user.organizationId },
      include: {
        client: true,
        practitioner: { select: { id: true, name: true } },
        service: true,
        room: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("[GET /api/appointments/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
