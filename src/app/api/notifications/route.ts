import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Derive notifications from existing data rather than a separate table.
// "Unread" means created after user.notificationsSeenAt (or all if never seen).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationsSeenAt: true, notificationsEnabled: true },
  });

  const seenAt = user?.notificationsSeenAt ?? new Date(0);
  const lookback = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // 30 days

  const [paidInvoices, unreadMessages, upcomingAppointments, newAppointments] =
    await Promise.all([
      // Invoices paid recently
      db.invoice.findMany({
        where: {
          organizationId: orgId,
          status: "PAID",
          paidAt: { gte: lookback },
        },
        select: {
          id: true,
          number: true,
          total: true,
          paidAt: true,
          client: { select: { firstName: true, lastName: true } },
        },
        orderBy: { paidAt: "desc" },
        take: 20,
      }),
      // Inbound messages from clients
      db.message.findMany({
        where: {
          organizationId: orgId,
          direction: "INBOUND",
          createdAt: { gte: lookback },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          client: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Appointments in the next 48 hours
      db.appointment.findMany({
        where: {
          organizationId: orgId,
          startTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 1000 * 60 * 60 * 48),
          },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        select: {
          id: true,
          startTime: true,
          client: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
        take: 10,
      }),
      // Newly created appointments (last 7 days)
      db.appointment.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
        },
        select: {
          id: true,
          startTime: true,
          createdAt: true,
          client: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  type Notification = {
    id: string;
    type: "invoice_paid" | "new_message" | "upcoming_appointment" | "new_appointment";
    title: string;
    body: string;
    href: string;
    timestamp: Date;
    isNew: boolean;
  };

  const notifications: Notification[] = [
    ...paidInvoices.map((inv) => ({
      id: `invoice_paid:${inv.id}`,
      type: "invoice_paid" as const,
      title: "Invoice paid",
      body: `${inv.client.firstName} ${inv.client.lastName} paid invoice #${inv.number}`,
      href: `/dashboard/billing/${inv.id}`,
      timestamp: inv.paidAt!,
      isNew: inv.paidAt! > seenAt,
    })),
    ...unreadMessages.map((msg) => ({
      id: `message:${msg.id}`,
      type: "new_message" as const,
      title: "New message",
      body: msg.client
        ? `From ${msg.client.firstName} ${msg.client.lastName}: ${msg.content.slice(0, 80)}`
        : msg.content.slice(0, 80),
      href: `/dashboard/messages`,
      timestamp: msg.createdAt,
      isNew: msg.createdAt > seenAt,
    })),
    ...upcomingAppointments.map((appt) => ({
      id: `upcoming:${appt.id}`,
      type: "upcoming_appointment" as const,
      title: "Upcoming appointment",
      body: `${appt.client.firstName} ${appt.client.lastName}${appt.service ? ` · ${appt.service.name}` : ""} · ${new Date(appt.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
      href: `/dashboard/schedule/${appt.id}`,
      timestamp: appt.startTime,
      isNew: false, // upcoming appts aren't "new", they're reminders
    })),
    ...newAppointments.map((appt) => ({
      id: `new_appt:${appt.id}`,
      type: "new_appointment" as const,
      title: "New appointment scheduled",
      body: `${appt.client.firstName} ${appt.client.lastName}${appt.service ? ` · ${appt.service.name}` : ""} · ${new Date(appt.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      href: `/dashboard/schedule/${appt.id}`,
      timestamp: appt.createdAt,
      isNew: appt.createdAt > seenAt,
    })),
  ];

  // Sort by timestamp desc, deduplicate
  const seen = new Set<string>();
  const deduped = notifications
    .filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 30);

  const unreadCount = deduped.filter((n) => n.isNew).length;

  return NextResponse.json({ notifications: deduped, unreadCount });
}

// PATCH — mark all notifications as seen (updates notificationsSeenAt)
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { notificationsSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
