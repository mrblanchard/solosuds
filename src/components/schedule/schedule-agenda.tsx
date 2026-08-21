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

/**
 * A scannable day-by-day list of upcoming appointments, for practices with
 * enough volume that clicking through a calendar grid to see what's coming
 * up is slower than just reading a list. Shows today onward only — past
 * appointments belong in the calendar's history, not a forward-looking
 * agenda — and groups by the organization's own calendar day (not the
 * server's), same as the rest of the booking system.
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

  const upcoming = appointments
    .filter((a) => a.status !== "CANCELLED")
    .filter((a) => getZonedDateString(new Date(a.startTime), orgTimezone) >= todayStr);

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
        <p className="text-sm text-gray-400">No upcoming appointments.</p>
      </div>
    );
  }

  // Group by the org's local calendar day, preserving chronological order
  // (appointments already arrive sorted by startTime from the query).
  const groups = new Map<string, AgendaAppointment[]>();
  for (const appt of upcoming) {
    const key = getZonedDateString(new Date(appt.startTime), orgTimezone);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(appt);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([dateKey, dayAppts]) => {
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
  );
}
