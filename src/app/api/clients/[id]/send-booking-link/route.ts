import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendEmail, buildBrandedEmail } from "@/lib/email";
import { sendSms } from "@/lib/twilio";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const method = body?.method === "sms" ? "sms" : "email";

  const client = await db.client.findFirst({
    where: { id, organizationId: orgId },
    select: { firstName: true, lastName: true, email: true, phone: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
  const bookingUrl = `${baseUrl}/book?org=${org.id}`;

  if (method === "email") {
    if (!client.email) return NextResponse.json({ error: "This client has no email on file" }, { status: 400 });
    try {
      await sendEmail({
        to: client.email,
        subject: `Book your next appointment with ${org.name}`,
        html: buildBrandedEmail(
          `<p>Hi ${client.firstName},</p>
           <p>You can book your next appointment with us online, anytime:</p>
           <p><a href="${bookingUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Book an Appointment</a></p>`,
          org
        ),
      });
    } catch (err) {
      console.error("[send-booking-link] email failed:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
  } else {
    if (!client.phone) return NextResponse.json({ error: "This client has no phone number on file" }, { status: 400 });
    try {
      await sendSms({
        to: client.phone,
        body: `Hi ${client.firstName}, book your next appointment with ${org.name} here: ${bookingUrl}`,
      });
    } catch (err) {
      console.error("[send-booking-link] sms failed:", err);
      return NextResponse.json({ error: "Failed to send text" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
