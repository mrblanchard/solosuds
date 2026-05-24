import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PlanPageClient from "./plan-client";

export default async function PlanPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/login");

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { plan: true, subscriptionStatus: true, stripeCustomerId: true },
  });

  if (!org) redirect("/dashboard");

  return (
    <PlanPageClient
      currentPlan={org.plan ?? "solo"}
      hasStripeCustomer={!!org.stripeCustomerId}
      status={org.subscriptionStatus ?? "trialing"}
    />
  );
}
