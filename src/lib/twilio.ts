import Twilio from "twilio";

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

  const message = await client.messages.create({ to, from, body });
  return { sid: message.sid };
}
