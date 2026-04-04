import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/email";

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
    select: { id: true, phone: true, organizationId: true, firstName: true, lastName: true },
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

    // Forward SMS to users with smsForwardNumber configured
    try {
      const orgUsers = await db.user.findMany({
        where: {
          organizationId: matched.organizationId,
          smsForwardNumber: { not: null },
        },
        select: { smsForwardNumber: true, email: true, name: true },
      });

      const clientName = `${matched.firstName} ${matched.lastName}`;

      for (const user of orgUsers) {
        // Forward via SMS
        if (user.smsForwardNumber) {
          try {
            await sendSms({
              to: user.smsForwardNumber,
              body: `SMS from ${clientName} (${from}):\n${messageBody}`,
            });
          } catch (smsErr) {
            console.error("Failed to forward SMS:", smsErr);
          }
        }

        // Also send email notification
        if (user.email) {
          try {
            await sendEmail({
              to: user.email,
              subject: `New SMS from ${clientName}`,
              html: `
                <p>You received a new SMS from <strong>${clientName}</strong> (${from}):</p>
                <blockquote style="border-left:3px solid #6366f1;padding:8px 16px;margin:16px 0;background:#f5f3ff;border-radius:4px;">
                  ${messageBody.replace(/\n/g, "<br>")}
                </blockquote>
                <p><a href="${process.env.NEXTAUTH_URL ?? "https://soapsuds.app"}/dashboard/messages">View in Dashboard</a></p>
              `,
            });
          } catch (emailErr) {
            console.error("Failed to send SMS notification email:", emailErr);
          }
        }
      }
    } catch (fwdErr) {
      console.error("Failed to process SMS forwarding:", fwdErr);
    }
  }

  // Respond with empty TwiML — no auto-reply
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
