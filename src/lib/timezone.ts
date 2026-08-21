/**
 * Timezone-aware helpers for the booking flow.
 *
 * Business hours ("9am-5pm") only mean something in the organization's own
 * timezone (org.timezone). Everywhere else in the app, a Date is a plain UTC
 * instant, so any code that reads/writes "wall clock hour" against org hours
 * has to explicitly convert through org.timezone rather than relying on
 * `.getHours()`/`.setHours()`, which use the server process's local
 * timezone (UTC on Vercel) — that mismatch is exactly what let a client
 * pick an in-hours slot that the server then rejected as "outside business
 * hours" (or vice versa), depending on the gap between the two.
 */

/** (local wall-clock time in timeZone) - (UTC), in milliseconds, at the given instant. */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = parseInt(p.value, 10);
  }
  // Midnight-hour edge case: Intl reports hour 24 instead of 0 for h23 at times.
  const hour = parts.hour === 24 ? 0 : parts.hour;
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

/**
 * Converts a wall-clock date + hour/minute in `timeZone` to the UTC instant
 * it represents, e.g. zonedTimeToUtc("2026-08-21", 14, 0, "America/New_York")
 * -> the Date for 2:00 PM Eastern that day (correctly across DST).
 */
export function zonedTimeToUtc(dateStr: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset1 = getTimeZoneOffsetMs(new Date(guess), timeZone);
  const utc1 = guess - offset1;
  // Re-derive the offset from the corrected instant in case the first guess
  // landed on the wrong side of a DST transition.
  const offset2 = getTimeZoneOffsetMs(new Date(utc1), timeZone);
  return new Date(guess - offset2);
}

/** Returns the wall-clock hour (with fractional minutes, e.g. 14.5 for 2:30 PM) that `date` falls on in `timeZone`. */
export function getZonedHourFraction(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" });
  let hour = 0;
  let minute = 0;
  for (const p of dtf.formatToParts(date)) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
  }
  if (hour === 24) hour = 0;
  return hour + minute / 60;
}

/** Returns "HH:mm" (24-hour, zero-padded) that `date` falls on in `timeZone`. */
export function formatZonedHHmm(date: Date, timeZone: string): string {
  const hourFraction = getZonedHourFraction(date, timeZone);
  const hh = Math.floor(hourFraction);
  const mm = Math.round((hourFraction - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Returns the day-of-week (0=Sun..6=Sat) that `date` falls on in `timeZone`. */
export function getZonedDayOfWeek(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

/** Returns the "YYYY-MM-DD" calendar date that `date` falls on in `timeZone`. */
export function getZonedDateString(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Formats `date` for display as wall-clock date/time in `timeZone`, e.g. { dateStr: "August 21, 2026", timeStr: "2:00 PM" }. */
export function formatZonedDisplay(date: Date, timeZone: string): { dateStr: string; timeStr: string } {
  const dateStr = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "long", day: "numeric" }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  return { dateStr, timeStr };
}

/** Returns the [start, end] UTC instants spanning the calendar day `dateStr` in `timeZone` (00:00:00.000 to 23:59:59.999 local). */
export function getZonedDayBounds(dateStr: string, timeZone: string): [Date, Date] {
  const start = zonedTimeToUtc(dateStr, 0, 0, timeZone);
  const nextDay = new Date(zonedTimeToUtc(dateStr, 0, 0, timeZone).getTime() + 25 * 60 * 60000);
  const nextDayStr = getZonedDateString(nextDay, timeZone);
  const end = new Date(zonedTimeToUtc(nextDayStr, 0, 0, timeZone).getTime() - 1);
  return [start, end];
}
