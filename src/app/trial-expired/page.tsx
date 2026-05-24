import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PricingSection from "@/components/pricing-section";
import { Clock, PauseCircle } from "lucide-react";
import ResumeButton from "./resume-button";

export default async function TrialExpiredPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/login");

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { subscriptionStatus: true, stripeSubscriptionId: true, subscriptionPeriodEnd: true },
  });

  // If they have an active/trialing subscription, send them to dashboard
  if (org?.subscriptionStatus === "active" || org?.subscriptionStatus === "trialing") {
    redirect("/dashboard");
  }

  const isPaused = org?.subscriptionStatus === "paused";

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-6 ${isPaused ? "bg-gray-100" : "bg-indigo-100"}`}>
            {isPaused
              ? <PauseCircle className="h-8 w-8 text-gray-500" />
              : <Clock className="h-8 w-8 text-indigo-600" />}
          </div>

          {isPaused ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900">Your membership is paused</h1>
              <p className="mt-3 text-lg text-gray-600 max-w-md mx-auto">
                Your account and data are preserved. Resume your membership to pick up right where you left off.
              </p>
              {org?.subscriptionPeriodEnd && (
                <p className="mt-2 text-sm text-gray-500">
                  Billing resumes automatically on{" "}
                  <strong>
                    {new Date(org.subscriptionPeriodEnd).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                    })}
                  </strong>
                </p>
              )}
              {org?.stripeSubscriptionId && (
                <div className="mt-6">
                  <ResumeButton />
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">Your free trial has ended</h1>
              <p className="mt-3 text-lg text-gray-600 max-w-md mx-auto">
                Select a plan below to continue using SoloSuds and access all your data.
              </p>
            </>
          )}
        </div>

        {/* Show pricing only for non-paused (they need to resume, not re-subscribe) */}
        {!isPaused && <PricingSection showCheckout />}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Have questions?{" "}
            <a href="mailto:support@solosuds.com" className="text-indigo-600 hover:underline">
              Contact support
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Your data is safely preserved and will be available once you subscribe.
          </p>
        </div>
      </div>
    </div>
  );
}
