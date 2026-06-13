import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvoiceEmail } from "@/lib/email";
import { buildAltPaymentOptions } from "@/lib/alt-payments";
import { formatDate } from "@/lib/utils";

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
    const { status, dueDate, notes } = body;

    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: session.user.organizationId },
      include: { client: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.invoice.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
        ...(status === "PAID" && { paidAt: new Date() }),
      },
    });

    // Email the client a payment link the first time an invoice is sent
    let emailSent: boolean | undefined;
    const clientEmail = invoice.client.email;
    if (invoice.status === "DRAFT" && status === "SENT" && clientEmail) {
      emailSent = false;
      try {
        let publicToken = invoice.publicToken;
        if (!publicToken) {
          publicToken = crypto.randomBytes(16).toString("hex");
          await db.invoice.update({ where: { id }, data: { publicToken } });
        }

        const org = await db.organization.findUnique({
          where: { id: session.user.organizationId },
          select: {
            name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true,
            venmoHandle: true, cashAppHandle: true, paypalHandle: true, squareHandle: true, zelleHandle: true,
          },
        });

        const payUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${publicToken}`;
        const altPayments = org ? buildAltPaymentOptions(org, updated.total, updated.number) : [];

        const { subject, html, result } = await sendInvoiceEmail({
          to: clientEmail,
          clientName: `${invoice.client.firstName} ${invoice.client.lastName}`,
          invoiceNumber: updated.number,
          total: updated.total,
          dueDate: updated.dueDate ? formatDate(updated.dueDate) : null,
          payUrl,
          altPayments,
          branding: org,
        });

        if (!result.error) {
          emailSent = true;
          await db.email.create({
            data: {
              organizationId: session.user.organizationId,
              senderId: session.user.id,
              clientId: invoice.clientId,
              direction: "OUTBOUND",
              fromEmail: process.env.FROM_EMAIL || "noreply@solosuds.com",
              toEmail: clientEmail,
              subject,
              htmlBody: html,
              resendId: result.data?.id || null,
              read: true,
            },
          });
        }
      } catch (err) {
        console.error("[PATCH /api/invoices/:id] send invoice email", err);
      }
    }

    return NextResponse.json({ ...updated, emailSent });
  } catch (error) {
    console.error("[PATCH /api/invoices/:id]", error);
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

    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: session.user.organizationId },
      include: { client: true, appointment: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("[GET /api/invoices/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
