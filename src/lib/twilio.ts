import Twilio from "twilio";
import type { NextRequest } from "next/server";
import { formatDate, formatDateTime } from "@/lib/utils";

let _client: ReturnType<typeof Twilio> | null = null;

// All client-facing SMS bodies open with "SoloSuds:" and end with an
// opt-out instruction, matching the A2P 10DLC campaign's registered sample
// messages. Keep these in sync with the campaign registration if either
// changes — Twilio vets sample copy against what actually gets sent.

/** "SoloSuds: You're confirmed for {service} on {date}. Manage: {url}. Reply STOP to opt out." */
export function buildAppointmentConfirmationSms(opts: {
  serviceName: string;
  startTime: Date | string;
  manageUrl: string;
}): string {
  return `SoloSuds: You're confirmed for ${opts.serviceName} on ${formatDateTime(opts.startTime)}. Manage: ${opts.manageUrl}. Reply STOP to opt out.`;
}

/** "SoloSuds: Reminder, your {service} appointment is {date}. Reply STOP to opt out." */
export function buildAppointmentReminderSms(opts: {
  serviceName: string;
  startTime: Date | string;
}): string {
  return `SoloSuds: Reminder, your ${opts.serviceName} appointment is ${formatDateTime(opts.startTime)}. Reply STOP to opt out.`;
}

/** "SoloSuds: Your appointment was rescheduled to {date}. Details: {url}. Reply STOP to opt out." */
export function buildAppointmentRescheduledSms(opts: {
  startTime: Date | string;
  manageUrl: string;
}): string {
  return `SoloSuds: Your appointment was rescheduled to ${formatDateTime(opts.startTime)}. Details: ${opts.manageUrl}. Reply STOP to opt out.`;
}

/** "SoloSuds: A spot opened up on {date}. Book now: {url}. Reply STOP to opt out." */
export function buildWaitlistOpeningSms(opts: {
  openingDate: Date | string;
  bookingUrl: string;
}): string {
  return `SoloSuds: A spot opened up on ${formatDate(opts.openingDate, "MMMM d, yyyy")}. Book now: ${opts.bookingUrl}. Reply STOP to opt out.`;
}

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
