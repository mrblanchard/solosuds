import { DashboardShell } from "@/components/layout/dashboard-shell";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

const TRIAL_DAYS = 14;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.organizationId) redirect("/onboarding");

  // Check trial expiry
  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { subscriptionStatus: true, createdAt: true },
  });

  if (org?.subscriptionStatus === "trialing") {
    const trialEnd = new Date(org.createdAt.getTime() + TRIAL_DAYS * 86400000);
    if (Date.now() > trialEnd.getTime()) {
      // Update status so they don't keep hitting this check
      await db.organization.update({
        where: { id: session.user.organizationId },
        data: { subscriptionStatus: "canceled" },
      });
      redirect("/trial-expired");
    }
  }

  if (org?.subscriptionStatus === "canceled" || org?.subscriptionStatus === "paused") {
    redirect("/trial-expired");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
