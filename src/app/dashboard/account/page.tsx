import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import AccountClient from "./account-client";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/login");

  const orgId = session.user.organizationId;

  const [user, org, clientCount, appointmentCount, invoiceCount, noteCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        notificationsEnabled: true,
        createdAt: true,
      },
    }),
    db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        subscriptionPeriodEnd: true,
        plan: true,
        createdAt: true,
      },
    }),
    db.client.count({ where: { organizationId: orgId } }),
    db.appointment.count({ where: { organizationId: orgId } }),
    db.invoice.count({ where: { organizationId: orgId } }),
    db.soapNote.count({ where: { organizationId: orgId } }),
  ]);

  if (!user || !org) notFound();

  return (
    <AccountClient
      user={user}
      org={org}
      exportCounts={{
        clients: clientCount,
        appointments: appointmentCount,
        invoices: invoiceCount,
        notes: noteCount,
      }}
    />
  );
}
