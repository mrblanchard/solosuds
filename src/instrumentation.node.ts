import { startReminderSweep } from "@/lib/reminder-sweep";

// Only run the automatic reminder sweep in the deployed production process.
// Local dev shares the same database as production, so running this in dev
// would email real clients while testing.
//
// On Vercel, serverless instances are ephemeral and this setInterval loop
// isn't reliable, so a Vercel Cron job hits /api/cron/reminder-sweep instead
// (see vercel.json) and this in-process sweep is skipped there.
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  startReminderSweep();
}
