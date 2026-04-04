import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import ScheduleCalendar from "@/components/schedule/schedule-calendar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#5a4f8a",
  CONFIRMED: "#16a34a",
  IN_PROGRESS: "#d97706",
  COMPLETED: "#64748b",
  CANCELLED: "#dc2626",
  NO_SHOW: "#ea580c",
};

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");
  const orgId = session.user.organizationId;

  // Fetch 3-month window of appointments
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const appointments = await db.appointment.findMany({
    where: {
      organizationId: orgId,
      startTime: { gte: start, lte: end },
    },
    include: {
      client: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const events = appointments.map((appt) => ({
    id: appt.id,
    title: `${appt.client.firstName} ${appt.client.lastName}`,
    start: appt.startTime.toISOString(),
    end: appt.endTime.toISOString(),
    backgroundColor: STATUS_COLORS[appt.status] ?? "#6366f1",
    borderColor: "transparent",
    extendedProps: {
      clientName: `${appt.client.firstName} ${appt.client.lastName}`,
      serviceName: appt.service?.name ?? "Session",
      status: appt.status,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <Link href="/dashboard/schedule/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </Link>
      </div>

      <ScheduleCalendar events={events} />
    </div>
  );
}
