import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Twilio sends form-encoded POST when an SMS is received
export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = new URLSearchParams(text);

  const from = params.get("From");       // E.164 e.g. "+16032838443"
  const messageBody = params.get("Body");
  const messageSid = params.get("MessageSid");

  if (!from || !messageBody) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Normalize: strip non-digits, take last 10 for US comparison
  const normalizedFrom = from.replace(/\D/g, "").slice(-10);

  // Find a client whose phone matches
  const clients = await db.client.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, organizationId: true },
  });

  const matched = clients.find((c) => {
    if (!c.phone) return false;
    return c.phone.replace(/\D/g, "").slice(-10) === normalizedFrom;
  });

  if (matched) {
    await db.message.create({
      data: {
        organizationId: matched.organizationId,
        clientId: matched.id,
        channel: "SMS",
        direction: "INBOUND",
        content: messageBody,
        status: "DELIVERED",
        externalId: messageSid ?? undefined,
      },
    });
  }

  // Respond with empty TwiML — no auto-reply
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
