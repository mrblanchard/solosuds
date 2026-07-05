import { startReminderSweep } from "@/lib/reminder-sweep";

// Only run the automatic reminder sweep in the deployed production process.
// Local dev shares the same database as production, so running this in dev
// would email real clients while testing.
if (process.env.NODE_ENV === "production") {
  startReminderSweep();
}
