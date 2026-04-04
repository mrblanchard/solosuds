import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardWidgets from "@/components/dashboard/dashboard-widgets";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default async function DashboardPage() {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const userId = session?.user?.id ?? "";

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">No organization found. Please contact support.</p>
      </div>
    );
  }

  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [
    clientCount,
    todayAppts,
    draftNotes,
    pendingInvoicesTotal,
    recentNotes,
    upcomingAppts,
    recentMessages,
  ] = await Promise.all([
    db.client.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    db.appointment.findMany({
      where: {
        organizationId: orgId,
        startTime: { gte: todayStart, lte: todayEnd },
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        service: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    db.soapNote.count({
      where: { organizationId: orgId, status: "DRAFT" },
    }),
    db.invoice.aggregate({
      _sum: { total: true },
      where: { organizationId: orgId, status: { in: ["SENT", "OVERDUE"] } },
    }),
    db.soapNote.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        sessionDate: true,
        status: true,
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { sessionDate: "desc" },
      take: 5,
    }),
    db.appointment.findMany({
      where: {
        organizationId: orgId,
        startTime: { gt: todayEnd, lte: next7Days },
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        service: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    db.message.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        direction: true,
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s what&apos;s happening at your practice today.
        </p>
      </div>

      <DashboardWidgets
        userId={userId}
        userName={session?.user?.name ?? ""}
        clientCount={clientCount}
        draftNotes={draftNotes}
        pendingInvoicesTotal={pendingInvoicesTotal._sum.total ?? 0}
        todayAppts={todayAppts}
        recentNotes={recentNotes}
        upcomingAppts={upcomingAppts}
        recentMessages={recentMessages}
      />
    </div>
  );
}

