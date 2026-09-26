// Build-time feature flags.

/**
 * Client texting. Off until a messaging provider is in place: sendSms in
 * @/lib/sms has no provider behind it yet, so no SMS can actually be delivered.
 *
 * While this is false, every practitioner-facing SMS entry point is shown as
 * "Coming soon" rather than failing at send time. The API routes still exist
 * and still return a clear 503 through describeSmsFailure, so a stale tab or a
 * direct call degrades cleanly instead of leaking an internal error.
 *
 * Flip to true once a provider is wired up and its number is verified.
 */
// Explicitly typed boolean, not a literal: otherwise TypeScript narrows every
// enabled branch to unreachable code and the flag becomes awkward to flip.
export const SMS_ENABLED: boolean = false;

/** Shown on disabled SMS controls so the copy stays consistent. */
export const SMS_COMING_SOON = "SMS reminders coming soon";
