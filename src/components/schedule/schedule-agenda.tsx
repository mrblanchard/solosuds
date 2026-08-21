import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getZonedDateString, formatZonedDisplay } from "@/lib/timezone";

export interface AgendaAppointment {
  id: string;
  startTime: Date | string;
  status: string;
  client: { firstName: string; lastName: string } | null;
  service?: { name: string } | null;
  practitioner?: { name: string | null } | null;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  SCHEDULED: "default",
  CONFIRMED: "success",
  IN_PROGRESS: "warning",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "warning",
};

const DAYS_AHEAD = 30; // "the next month" — a rolling 30-day window from today

/** Adds `days` to a "YYYY-MM-DD" string via pure calendar-date math (no timezone/DST involved — these are bucket keys, not instants). */
function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Sunday-anchored start-of-week for a "YYYY-MM-DD" string, matching this app's Sun-first week convention elsewhere (DAY_LABELS, the calendar grid). */
function startOfWeekStr(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

function formatMonthDay(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(
    new Date(`${dateStr}T00:00:00Z`)
  );
}

/**
 * A scannable list of upcoming appointments for the next 30 days, grouped by
 * week then by day, for practices with enough volume that clicking through
 * a calendar grid to see what's coming up is slower than just reading a
 * list. Shows today onward only — past appointments belong in the
 * calendar's history, not a forward-looking agenda — and groups by the
 * organization's own calendar day (not the server's), same as the rest of
 * the booking system.
 */
export function ScheduleAgenda({
  appointments,
  orgTimezone,
}: {
  appointments: AgendaAppointment[];
  orgTimezone: string;
}) {
  const now = new Date();
  const todayStr = getZonedDateString(now, orgTimezone);
  const cutoffStr = addDaysStr(todayStr, DAYS_AHEAD);
  const thisWeekStart = startOfWeekStr(todayStr);
  const nextWeekStart = addDaysStr(thisWeekStart, 7);

  const upcoming = appointments
    .filter((a) => a.status !== "CANCELLED")
    .filter((a) => {
      const key = getZonedDateString(new Date(a.startTime), orgTimezone);
      return key >= todayStr && key <= cutoffStr;
    });

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
        <p className="text-sm text-gray-400">No appointments in the next {DAYS_AHEAD} days.</p>
      </div>
    );
  }

  // Group by day first, then bucket those day-groups by the week they fall
  // in. Both maps preserve insertion order, and `upcoming` already arrives
  // sorted by startTime, so no re-sorting is needed at either level.
  const dayGroups = new Map<string, AgendaAppointment[]>();
  for (const appt of upcoming) {
    const key = getZonedDateString(new Date(appt.startTime), orgTimezone);
    if (!dayGroups.has(key)) dayGroups.set(key, []);
    dayGroups.get(key)!.push(appt);
  }

  const weekGroups = new Map<string, Map<string, AgendaAppointment[]>>();
  for (const [dayKey, dayAppts] of dayGroups) {
    const weekKey = startOfWeekStr(dayKey);
    if (!weekGroups.has(weekKey)) weekGroups.set(weekKey, new Map());
    weekGroups.get(weekKey)!.set(dayKey, dayAppts);
  }

  return (
    <div className="space-y-8">
      {[...weekGroups.entries()].map(([weekStart, days]) => {
        const weekEnd = addDaysStr(weekStart, 6);
        const weekRange = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}`;
        const weekLabel = weekStart === thisWeekStart ? "This Week" : weekStart === nextWeekStart ? "Next Week" : `Week of ${weekRange}`;
        const weekCount = [...days.values()].reduce((sum, d) => sum + d.length, 0);

        return (
          <div key={weekStart}>
            <div className="mb-3 flex items-baseline gap-2 border-b border-gray-200 pb-1.5">
              <h2 className="text-base font-bold text-gray-900">{weekLabel}</h2>
              {weekLabel !== `Week of ${weekRange}` && <span className="text-xs text-gray-400">{weekRange}</span>}
              <span className="text-xs text-gray-400">
                · {weekCount} appointment{weekCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-6">
              {[...days.entries()].map(([dateKey, dayAppts]) => {
                const dayLabel = new Intl.DateTimeFormat("en-US", {
                  timeZone: orgTimezone,
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }).format(new Date(dayAppts[0].startTime));
                const isToday = dateKey === todayStr;

                return (
                  <div key={dateKey}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{dayLabel}</h3>
                      {isToday && <Badge variant="default">Today</Badge>}
                      <span className="text-xs text-gray-400">
                        {dayAppts.length} appointment{dayAppts.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white divide-y divide-gray-100">
                      {dayAppts.map((appt) => {
                        const { timeStr } = formatZonedDisplay(new Date(appt.startTime), orgTimezone);
                        return (
                          <Link
                            key={appt.id}
                            href={`/dashboard/schedule/${appt.id}`}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-20 shrink-0 text-sm font-medium text-gray-700">{timeStr}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : "No client"}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {appt.service?.name ?? "Session"}
                                  {appt.practitioner?.name ? ` · ${appt.practitioner.name}` : ""}
                                </p>
                              </div>
                            </div>
                            <Badge variant={STATUS_VARIANT[appt.status] ?? "secondary"}>{appt.status}</Badge>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
