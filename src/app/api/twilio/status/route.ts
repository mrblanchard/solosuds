import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Twilio delivers status callbacks as form-encoded POST
// MessageStatus values: queued, sent, delivered, undelivered, failed
export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = new URLSearchParams(text);

  const messageSid = params.get("MessageSid");
  const messageStatus = params.get("MessageStatus");

  if (!messageSid || !messageStatus) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Map Twilio status to our schema values
  let status: string;
  if (messageStatus === "delivered") {
    status = "DELIVERED";
  } else if (messageStatus === "failed" || messageStatus === "undelivered") {
    status = "FAILED";
  } else {
    // queued, sent, accepted — leave as SENT
    status = "SENT";
  }

  await db.message.updateMany({
    where: { externalId: messageSid },
    data: { status },
  });

  // Twilio expects a 200 or 204 response
  return new NextResponse(null, { status: 204 });
}
