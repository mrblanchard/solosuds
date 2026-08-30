import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv, csvFilename } from "@/lib/csv";

const MAX_ROWS = 10000;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (user?.role === "PRACTITIONER" || user?.role === "FRONT_DESK") {
      return NextResponse.json({ error: "You do not have permission" }, { status: 403 });
    }

    const orgId = session.user.organizationId;

    const appointments = await db.appointment.findMany({
      where: { organizationId: orgId },
      orderBy: { startTime: "desc" },
      take: MAX_ROWS,
      include: {
        client: { select: { firstName: true, lastName: true } },
        practitioner: { select: { name: true } },
        service: { select: { name: true } },
        room: { select: { name: true } },
      },
    });

    const csv = toCsv(
      [
        { key: "clientName", label: "Client" },
        { key: "startTime", label: "Start Time" },
        { key: "endTime", label: "End Time" },
        { key: "status", label: "Status" },
        { key: "serviceName", label: "Service" },
        { key: "practitionerName", label: "Practitioner" },
        { key: "roomName", label: "Room" },
        { key: "notes", label: "Notes" },
        { key: "createdAt", label: "Created At" },
      ],
      appointments.map((a) => ({
        clientName: a.client ? `${a.client.firstName} ${a.client.lastName}` : "",
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        status: a.status,
        serviceName: a.service?.name ?? "",
        practitionerName: a.practitioner?.name ?? "",
        roomName: a.room?.name ?? "",
        notes: a.notes ?? "",
        createdAt: a.createdAt.toISOString(),
      }))
    );

    await db.exportAuditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id!,
        dataType: "appointments",
        recordCount: appointments.length,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("appointments")}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/export/appointments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
