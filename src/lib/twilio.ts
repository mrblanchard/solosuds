import Twilio from "twilio";
import type { NextRequest } from "next/server";

let _client: ReturnType<typeof Twilio> | null = null;

function getTwilio() {
  if (_client) return _client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  _client = Twilio(sid, token);
  return _client;
}

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ sid: string }> {
  // In development (or when Twilio is not configured), log instead of sending
  if (
    process.env.NODE_ENV !== "production" &&
    (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)
  ) {
    console.log(`\n📱 [DEV SMS] To: ${to}\n${body}\n`);
    return { sid: "dev_mock_" + Date.now() };
  }

  const client = getTwilio();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error("TWILIO_PHONE_NUMBER not configured");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
  const statusCallback = appUrl ? `${appUrl}/api/twilio/status` : undefined;

  const message = await client.messages.create({
    to,
    from,
    body,
    ...(statusCallback ? { statusCallback } : {}),
  });
  return { sid: message.sid };
}

/** Verify that an incoming webhook request was actually sent by Twilio. */
export function isValidTwilioRequest(request: NextRequest, params: Record<string, string>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const url = `${proto}://${host}${request.nextUrl.pathname}`;

  return Twilio.validateRequest(authToken, signature, url, params);
}
