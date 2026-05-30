"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const coreFeatures = [
  "Unlimited SOAP & session notes",
  "Unlimited active clients",
  "Online scheduling & self-booking",
  "Intake form builder",
  "Invoicing",
  "Email & SMS messaging",
  "Client document portal",
  "White label branding",
  "Community support",
];

export default function PricingSection({ showCheckout = false }: { showCheckout?: boolean }) {
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleCheckout(planKey: string) {
    setLoading(planKey);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, interval: yearly ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setCheckoutError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="mt-2 text-gray-500">No per-note fees. No surprise charges.</p>

          {/* Toggle */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                !yearly
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                yearly
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                10% off
              </span>
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          {checkoutError && (
            <div className="mb-6 w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {checkoutError}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900">Solo</h3>
            <p className="mt-1 text-sm text-gray-500">Everything you need to run your business</p>
            <p className="mt-4 text-4xl font-extrabold text-gray-900">
              {yearly ? "$19.99" : "$24.99"}
              <span className="text-base font-normal text-gray-400">/mo</span>
            </p>
            {yearly && (
              <p className="text-xs mt-0.5 text-gray-400">$239.88/yr · billed annually</p>
            )}
            <ul className="mt-6 space-y-2">
              {coreFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            {showCheckout ? (
              <Button
                className="mt-8 w-full"
                disabled={loading === "solo"}
                onClick={() => handleCheckout("solo")}
              >
                {loading === "solo" ? "Redirecting…" : "Subscribe now"}
              </Button>
            ) : (
              <Link href="/register" className="mt-8 block">
                <Button className="w-full">Start free trial</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
