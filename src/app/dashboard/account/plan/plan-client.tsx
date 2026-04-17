"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PricingSection from "@/components/pricing-section";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface Props {
  currentPlan: string;
  hasStripeCustomer: boolean;
  status: string;
}

export default function PlanPageClient({ currentPlan, hasStripeCustomer, status }: Props) {
  const router = useRouter();
  const [portalLoading, setPortalLoading] = useState(false);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  const isActive = status === "active";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Choose a plan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Currently on the <span className="font-semibold capitalize text-gray-700">{currentPlan}</span> plan
            {isActive ? " · Active" : ""}
          </p>
        </div>
      </div>

      {isActive && hasStripeCustomer && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Already subscribed?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Use the Stripe billing portal to upgrade, downgrade, or update your payment method.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={openBillingPortal}
            disabled={portalLoading}
          >
            <ExternalLink className="h-4 w-4" />
            {portalLoading ? "Opening…" : "Manage billing"}
          </Button>
        </div>
      )}

      <PricingSection showCheckout />
    </div>
  );
}
