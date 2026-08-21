import Twilio from "twilio";
import type { NextRequest } from "next/server";
import { formatDate, formatDateTime } from "@/lib/utils";

let _client: ReturnType<typeof Twilio> | null = null;

// All client-facing SMS bodies open with "{Practice Name} via SoloSuds:" and
// end with an opt-out instruction. The "via SoloSuds" is intentional, not
// cosmetic: the A2P 10DLC / toll-free registration's sample messages and use
// case description identify the sender as "SoloSuds," so every message has
// to keep that string present even while surfacing the practitioner's own
// business name for white-labeling. Don't drop "SoloSuds" from these — that
// would deviate from what was actually approved on the registered number.
// Keep the copy in sync with the registration if either changes.

function brandPrefix(orgName: string): string {
  return `${orgName} via SoloSuds`;
}

/** "{Practice} via SoloSuds: You're confirmed for {service} on {date}. Manage: {url}. Reply STOP to opt out." */
export function buildAppointmentConfirmationSms(opts: {
  orgName: string;
  serviceName: string;
  startTime: Date | string;
  manageUrl: string;
}): string {
  return `${brandPrefix(opts.orgName)}: You're confirmed for ${opts.serviceName} on ${formatDateTime(opts.startTime)}. Manage: ${opts.manageUrl}. Reply STOP to opt out.`;
}

/** "{Practice} via SoloSuds: Reminder, your {service} appointment is {date}. Reply STOP to opt out." */
export function buildAppointmentReminderSms(opts: {
  orgName: string;
  serviceName: string;
  startTime: Date | string;
}): string {
  return `${brandPrefix(opts.orgName)}: Reminder, your ${opts.serviceName} appointment is ${formatDateTime(opts.startTime)}. Reply STOP to opt out.`;
}

/** "{Practice} via SoloSuds: Your appointment was rescheduled to {date}. Details: {url}. Reply STOP to opt out." */
export function buildAppointmentRescheduledSms(opts: {
  orgName: string;
  startTime: Date | string;
  manageUrl: string;
}): string {
  return `${brandPrefix(opts.orgName)}: Your appointment was rescheduled to ${formatDateTime(opts.startTime)}. Details: ${opts.manageUrl}. Reply STOP to opt out.`;
}

/** "{Practice} via SoloSuds: A spot opened up on {date}. Book now: {url}. Reply STOP to opt out." */
export function buildWaitlistOpeningSms(opts: {
  orgName: string;
  openingDate: Date | string;
  bookingUrl: string;
}): string {
  return `${brandPrefix(opts.orgName)}: A spot opened up on ${formatDate(opts.openingDate, "MMMM d, yyyy")}. Book now: ${opts.bookingUrl}. Reply STOP to opt out.`;
}

/** "{Practice} via SoloSuds: You are now opted in to receive appointment text notifications. ..." */
export function buildOptInConfirmationSms(orgName: string): string {
  return `${brandPrefix(orgName)}: You are now opted in to receive appointment text notifications. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`;
}

/** "{Practice} via SoloSuds: {content} Reply STOP to opt out." — a practitioner's own free-text message to a client. */
export function buildFreeformMessageSms(opts: { orgName: string; content: string }): string {
  const body = opts.content.trim();
  const punctuated = /[.!?]$/.test(body) ? body : `${body}.`;
  return `${brandPrefix(opts.orgName)}: ${punctuated} Reply STOP to opt out.`;
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
