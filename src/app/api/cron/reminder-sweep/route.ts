import { NextResponse } from "next/server";
import { runReminderSweep } from "@/lib/reminder-sweep";

// Triggered by Vercel Cron (see vercel.json). Vercel automatically sends
// "Authorization: Bearer $CRON_SECRET" when that env var is set, so this
// rejects any other caller instead of relying on the request coming from
// inside the platform.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderSweep();
  return NextResponse.json(result);
}
