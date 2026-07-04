export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Only run the automatic reminder sweep in the deployed production process.
  // Local dev shares the same database as production, so running this in dev
  // would email real clients while testing.
  if (process.env.NODE_ENV !== "production") return;

  const { startReminderSweep } = await import("@/lib/reminder-sweep");
  startReminderSweep();
}
