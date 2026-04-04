"use client";

import { useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";

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

interface ScheduleCalendarProps {
  events: CalendarEvent[];
}

export default function ScheduleCalendar({ events }: ScheduleCalendarProps) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEventClick = useCallback((info: EventClickArg) => {
    router.push(`/dashboard/schedule/${info.event.id}`);
  }, [router]);

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    const start = info.startStr;
    router.push(`/dashboard/schedule/new?start=${encodeURIComponent(start)}`);
  }, [router]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        selectable
        select={handleDateSelect}
        eventClick={handleEventClick}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        height="auto"
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        eventDidMount={(info) => {
          const props = info.event.extendedProps;
          if (props?.clientName) {
            info.el.title = `${props.clientName}\n${props.serviceName}\nStatus: ${props.status}`;
          }
        }}
        nowIndicator
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "08:00",
          endTime: "18:00",
        }}
      />
    </div>
  );
}
