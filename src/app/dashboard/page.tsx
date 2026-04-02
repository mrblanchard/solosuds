import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CalendarDays,
  FileText,
  CreditCard,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  const orgId = session?.user?.organizationId;

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">No organization found. Please contact support.</p>
      </div>
    );
  }

  const [clientCount, todayAppts, draftNotes, pendingInvoicesTotal] =
    await Promise.all([
      db.client.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      db.appointment.findMany({
        where: {
          organizationId: orgId,
          startTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        include: { client: true, service: true },
        orderBy: { startTime: "asc" },
        take: 5,
      }),
      db.soapNote.count({
        where: { organizationId: orgId, status: "DRAFT" },
      }),
      db.invoice.aggregate({
        _sum: { total: true },
        where: { organizationId: orgId, status: { in: ["SENT", "OVERDUE"] } },
      }),
    ]);

  const stats = [
    {
      title: "Active Clients",
      value: clientCount,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/clients",
    },
    {
      title: "Today's Appointments",
      value: todayAppts.length,
      icon: CalendarDays,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/dashboard/schedule",
    },
    {
      title: "Draft Notes",
      value: draftNotes,
      icon: FileText,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/dashboard/notes?status=DRAFT",
    },
    {
      title: "Outstanding Invoices",
      value: formatCurrency(pendingInvoicesTotal._sum.total ?? 0),
      icon: CreditCard,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/dashboard/billing",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening at your practice today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-xl p-3 ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today's Schedule</CardTitle>
            <Link
              href="/dashboard/schedule"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {todayAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No appointments today</p>
                <Link
                  href="/dashboard/schedule/new"
                  className="mt-2 text-sm text-indigo-600 hover:underline"
                >
                  Schedule one →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {appt.client.firstName} {appt.client.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appt.service?.name ?? "Session"} ·{" "}
                        {formatDateTime(appt.startTime)}
                      </p>
                    </div>
                    <AppointmentBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-start rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <action.icon className="h-6 w-6 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">{action.label}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{action.description}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AppointmentBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "success" | "warning" | "secondary" | "destructive"; label: string }> = {
    SCHEDULED: { variant: "secondary", label: "Scheduled" },
    CONFIRMED: { variant: "default", label: "Confirmed" },
    IN_PROGRESS: { variant: "warning", label: "In Progress" },
    COMPLETED: { variant: "success", label: "Completed" },
    CANCELLED: { variant: "destructive", label: "Cancelled" },
    NO_SHOW: { variant: "destructive", label: "No Show" },
  };
  const config = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

const quickActions = [
  {
    href: "/dashboard/notes/new",
    label: "New SOAP Note",
    description: "Start a session note",
    icon: FileText,
  },
  {
    href: "/dashboard/schedule/new",
    label: "Book Appointment",
    description: "Schedule a client",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/clients/new",
    label: "Add Client",
    description: "Register new client",
    icon: Users,
  },
  {
    href: "/dashboard/billing/new",
    label: "Create Invoice",
    description: "Bill for services",
    icon: TrendingUp,
  },
];
