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
  if (!session.user.practiceType) redirect("/onboarding");

  // Check trial expiry + fetch branding in one query
  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      subscriptionStatus: true,
      createdAt: true,
      subscriptionPeriodEnd: true,
    },
  });

  if (org?.subscriptionStatus === "trialing") {
    const trialEnd = new Date(org.createdAt.getTime() + TRIAL_DAYS * 86400000);
    if (Date.now() > trialEnd.getTime()) {
      await db.organization.update({
        where: { id: session.user.organizationId },
        data: { subscriptionStatus: "canceled" },
      });
      redirect("/trial-expired");
    }
  }

  // canceling: cancel_at_period_end — keep access until the period ends
  if (org?.subscriptionStatus === "canceling" && org.subscriptionPeriodEnd) {
    if (Date.now() > org.subscriptionPeriodEnd.getTime()) {
      await db.organization.update({
        where: { id: session.user.organizationId },
        data: { subscriptionStatus: "canceled" },
      });
      redirect("/trial-expired");
    }
    // still within period — let them through
  }

  // paused: immediately blocked, no access until they resume
  if (org?.subscriptionStatus === "paused" || org?.subscriptionStatus === "canceled") {
    redirect("/trial-expired");
  }

  const branding = org
    ? { name: org.name, logoUrl: org.logoUrl ?? null, primaryColor: org.primaryColor ?? null }
    : null;

  return <DashboardShell branding={branding}>{children}</DashboardShell>;
}
