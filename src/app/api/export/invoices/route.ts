import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCsv, csvFilename } from "@/lib/csv";

const MAX_ROWS = 10000;

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

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

    const invoices = await db.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      include: {
        client: { select: { firstName: true, lastName: true } },
      },
    });

    const csv = toCsv(
      [
        { key: "number", label: "Invoice Number" },
        { key: "clientName", label: "Client" },
        { key: "status", label: "Status" },
        { key: "subtotal", label: "Subtotal" },
        { key: "tax", label: "Tax" },
        { key: "discountAmount", label: "Discount" },
        { key: "total", label: "Total" },
        { key: "dueDate", label: "Due Date" },
        { key: "paidAt", label: "Paid At" },
        { key: "notes", label: "Notes" },
        { key: "createdAt", label: "Created At" },
      ],
      invoices.map((inv) => ({
        number: inv.number,
        clientName: inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : "",
        status: inv.status,
        subtotal: centsToDollars(inv.subtotal),
        tax: centsToDollars(inv.tax),
        discountAmount: centsToDollars(inv.discountAmount),
        total: centsToDollars(inv.total),
        dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
        paidAt: inv.paidAt ? inv.paidAt.toISOString() : "",
        notes: inv.notes ?? "",
        createdAt: inv.createdAt.toISOString(),
      }))
    );

    await db.exportAuditLog.create({
      data: {
        organizationId: orgId,
        userId: session.user.id!,
        dataType: "invoices",
        recordCount: invoices.length,
        ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("invoices")}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/export/invoices]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
