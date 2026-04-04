"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const pricingPlans = [
  {
    name: "Solo",
    monthlyPrice: "$39",
    yearlyPrice: "$32",
    description: "1 practitioner",
    featured: false,
    features: [
      "Unlimited SOAP notes",
      "AI Scribe (200 min/mo)",
      "50 active clients",
      "Online scheduling",
      "Email reminders",
      "HIPAA compliance",
    ],
  },
  {
    name: "Practice",
    monthlyPrice: "$139",
    yearlyPrice: "$116",
    description: "Up to 5 practitioners",
    featured: true,
    features: [
      "Everything in Solo",
      "Unlimited clients",
      "AI Scribe (1,000 min/mo)",
      "Billing & payments",
      "Team calendar",
      "SMS reminders",
      "Priority support",
    ],
  },
  {
    name: "Clinic",
    monthlyPrice: "$389",
    yearlyPrice: "$324",
    description: "Unlimited practitioners",
    featured: false,
    features: [
      "Everything in Practice",
      "Unlimited AI Scribe",
      "Insurance claim exports",
      "Custom intake forms",
      "API access",
      "Success manager",
    ],
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

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
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 ${
                plan.featured
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-xl scale-105"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.featured && (
                <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  Most Popular
                </span>
              )}
              <h3
                className={`text-lg font-bold ${
                  plan.featured ? "text-white" : "text-gray-900"
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`mt-2 text-3xl font-extrabold ${
                  plan.featured ? "text-white" : "text-gray-900"
                }`}
              >
                {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                <span
                  className={`text-base font-normal ${
                    plan.featured ? "text-indigo-200" : "text-gray-400"
                  }`}
                >
                  /mo
                </span>
              </p>
              {yearly && (
                <p
                  className={`text-xs mt-0.5 ${
                    plan.featured ? "text-indigo-200" : "text-gray-400"
                  }`}
                >
                  billed annually
                </p>
              )}
              <p
                className={`mt-1 text-sm ${
                  plan.featured ? "text-indigo-200" : "text-gray-500"
                }`}
              >
                {plan.description}
              </p>
              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-center gap-2 text-sm ${
                      plan.featured ? "text-indigo-100" : "text-gray-600"
                    }`}
                  >
                    <CheckCircle
                      className={`h-4 w-4 shrink-0 ${
                        plan.featured ? "text-indigo-300" : "text-green-500"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-8 block">
                <Button
                  className="w-full"
                  variant={plan.featured ? "secondary" : "default"}
                >
                  Get started
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
