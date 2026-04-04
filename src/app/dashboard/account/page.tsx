import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import AccountClient from "./account-client";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/login");

  const [user, org] = await Promise.all([
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
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user || !org) notFound();

  return <AccountClient user={user} org={org} />;
}
