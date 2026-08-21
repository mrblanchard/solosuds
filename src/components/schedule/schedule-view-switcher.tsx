"use client";

import { useState } from "react";
import { LayoutList, CalendarRange } from "lucide-react";
import ScheduleCalendar from "@/components/schedule/schedule-calendar";
import { ScheduleAgenda, type AgendaAppointment } from "@/components/schedule/schedule-agenda";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  extendedProps?: {
    clientName: string;
    serviceName: string;
    status: string;
  };
}

export default function ScheduleViewSwitcher({
  events,
  appointments,
  orgTimezone,
}: {
  events: CalendarEvent[];
  appointments: AgendaAppointment[];
  orgTimezone: string;
}) {
  const [view, setView] = useState<"calendar" | "agenda">("calendar");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "calendar" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <CalendarRange className="h-4 w-4" />
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setView("agenda")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "agenda" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <LayoutList className="h-4 w-4" />
          Agenda
        </button>
      </div>

      {view === "calendar" ? (
        <ScheduleCalendar events={events} />
      ) : (
        <ScheduleAgenda appointments={appointments} orgTimezone={orgTimezone} />
      )}
    </div>
  );
}
