import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { sendIntakeFormLink } from "@/lib/email";
import { sendSms } from "@/lib/twilio";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  const body = await req.json();
  const { type, clientId } = body;

  if (!type || !clientId) {
    return NextResponse.json({ error: "type and clientId are required" }, { status: 400 });
  }

  const [form, client] = await Promise.all([
    db.intakeForm.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, title: true },
    }),
    db.client.findFirst({
      where: { id: clientId, organizationId: orgId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, smsConsentStatus: true },
    }),
  ]);

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const formUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/intake/${form.id}?clientId=${client.id}`;
  const clientName = `${client.firstName} ${client.lastName}`;

  if (type === "email") {
    if (!client.email) {
      return NextResponse.json({ error: "Client has no email address on file" }, { status: 400 });
    }

    await sendIntakeFormLink({ to: client.email, clientName, formUrl });

    await db.message.create({
      data: {
        organizationId: orgId,
        senderId: session.user.id,
        clientId: client.id,
        channel: "EMAIL",
        direction: "OUTBOUND",
        content: `Intake form link sent to ${client.email}: ${formUrl}`,
        status: "SENT",
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (type === "sms") {
    if (!client.phone) {
      return NextResponse.json({ error: "Client has no phone number on file" }, { status: 400 });
    }
    if (client.smsConsentStatus !== "CONSENTED") {
      return NextResponse.json(
        { error: "Client has not consented to receive SMS. Record consent on their client profile first." },
        { status: 400 }
      );
    }

    const smsBody = `Hi ${client.firstName}, please complete your intake form: ${formUrl} Reply STOP to opt out.`;

    let sid: string | undefined;
    try {
      const result = await sendSms({ to: client.phone, body: smsBody });
      sid = result.sid;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Twilio send error:", err);
      return NextResponse.json({ error: `SMS failed: ${msg}` }, { status: 500 });
    }

    await db.message.create({
      data: {
        organizationId: orgId,
        senderId: session.user.id,
        clientId: client.id,
        channel: "SMS",
        direction: "OUTBOUND",
        content: smsBody,
        status: "SENT",
        externalId: sid,
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type. Use 'email' or 'sms'." }, { status: 400 });
}
