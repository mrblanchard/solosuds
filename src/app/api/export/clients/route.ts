import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv, csvFilename } from "@/lib/csv";

// Full customer list export, for data portability ("get my client list out").
// Owner/Admin only, matches the role gate used for bulk client actions.
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

    const clients = await db.client.findMany({
      where: { organizationId: orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: MAX_ROWS,
    });

    const csv = toCsv(
      [
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "dateOfBirth", label: "Date of Birth" },
        { key: "gender", label: "Gender" },
        { key: "pronouns", label: "Pronouns" },
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "zip", label: "Zip Code" },
        { key: "country", label: "Country" },
        { key: "emergencyName", label: "Emergency Contact Name" },
        { key: "emergencyPhone", label: "Emergency Phone" },
        { key: "referralSource", label: "Referral Source" },
        { key: "internalNotes", label: "Internal Notes" },
        { key: "status", label: "Status" },
        { key: "createdAt", label: "Created At" },
      ],
      clients.map((c) => ({
        ...c,
        dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().slice(0, 10) : "",
        createdAt: c.createdAt.toISOString(),
      }))
    );

    await db.exportAuditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id!,
        dataType: "clients",
        recordCount: clients.length,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("clients")}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/export/clients]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
