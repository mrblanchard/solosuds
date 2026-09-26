import { formatDate, formatDateTime } from "@/lib/utils";

// All client-facing SMS bodies open with "{Practice Name} via SoloSuds:" and
// end with an opt-out instruction. Carrier registration (10DLC or toll-free)
// identifies the sender as "SoloSuds," so every message keeps that string
// present even while surfacing the practitioner's own business name for
// white-labeling. Keep this copy in sync with whatever sample messages are
// submitted when the new provider's number is registered.

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

/**
 * Raised when no SMS provider is wired up in this environment, as opposed to
 * a provider rejecting or failing a send. Callers use this to tell a setup
 * problem (nothing the practitioner can retry) apart from a transient
 * delivery failure (worth retrying).
 */
export class SmsNotConfiguredError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "SmsNotConfiguredError";
  }
}

/**
 * Map a sendSms failure to something safe to show a practitioner. The
 * underlying error text names internal infrastructure and must not reach the
 * UI; log it server-side instead.
 */
export function describeSmsFailure(err: unknown): { error: string; status: number } {
  if (err instanceof SmsNotConfiguredError) {
    return {
      error:
        "Text messaging isn't set up for this practice yet. Please contact support, or send this by email instead.",
      status: 503,
    };
  }
  return { error: "Failed to send text. Please try again.", status: 500 };
}

/**
 * Send one SMS. No provider is wired up yet, so outside production this logs
 * the message and returns a mock id, and in production it throws
 * SmsNotConfiguredError, which every caller already handles.
 *
 * To connect a provider: send the message here and return its message id as
 * `sid` (callers store it on Message.externalId). Delivery-status and inbound
 * reply webhooks go under src/app/api/webhooks/, which proxy.ts already
 * leaves public.
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ sid: string }> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📱 [DEV SMS] To: ${to}\n${body}\n`);
    return { sid: "dev_mock_" + Date.now() };
  }

  throw new SmsNotConfiguredError("No SMS provider is configured");
}
