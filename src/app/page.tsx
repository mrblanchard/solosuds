import Link from "next/link";
import { Button } from "@/components/ui/button";
import PricingSection from "@/components/pricing-section";
import LandingNav from "@/components/landing-nav";
import { AppFooter } from "@/components/layout/app-footer";
import {
  CalendarDays,
  Users,
  CreditCard,
  FileText,
  ArrowRight,
  CheckCircle,
  Palette,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b-primary">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center shrink-0">
            <img src="/logo.png" alt="SoloSuds" className="h-10 w-auto" />
          </div>
          <LandingNav />
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 py-24 text-center bg-cover bg-center bg-no-repeat bg-banner"
      >
        <div className="absolute inset-0 bg-white/50" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Built for independent practitioners
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Write your notes.
            
          </h1>
          <h2 className="text-4xl font-extrabold tracking-tight text-indigo-600 sm:text-6xl">Schedule your clients. </h2>
          <h3 className="text-4xl font-extrabold tracking-tight text-indigo-600 sm:text-6xl">Run your practice.</h3>
          <p className="mt-6 text-lg text-gray-700 max-w-2xl mx-auto rounded-xl bg-violet-100/20 px-3 py-3 backdrop-blur-sm">
           Easily schedule appointments, take session notes, send intake forms, manage and much more. All in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="px-8">
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* SOAP Suds Acronym Explainer */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-indigo-50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">
              What does{" "}
              <span className="text-indigo-600">Soap Suds</span> mean?
            </h2>
            <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
              The name tells the whole story.{" "}
              <strong className="text-gray-700">SOAP</strong> is the clinical
              documentation framework used by healthcare professionals worldwide.{" "}
              <strong className="text-gray-700">Suds</strong> is everything else
              your practice needs to run smoothly — from scheduling to sync.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* SOAP */}
            <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
              <div className="mb-8 flex items-center gap-3">
                <span className="rounded-xl bg-indigo-600 px-3 py-1.5 font-mono text-lg font-extrabold text-white tracking-widest">
                  SOAP
                </span>
                <span className="text-sm font-medium text-gray-500">
                  The clinical documentation framework
                </span>
              </div>
              <div className="space-y-6">
                {soapLetters.map(({ letter, label, description }) => (
                  <div key={label} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl font-extrabold text-indigo-600">
                      {letter}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suds */}
            <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
              <div className="mb-8 flex items-center gap-3">
                <span className="rounded-xl bg-indigo-600 px-3 py-1.5 font-mono text-lg font-extrabold text-white tracking-widest">
                  Suds
                </span>
                <span className="text-sm font-medium text-gray-500">
                  The practice management platform
                </span>
              </div>
              <div className="space-y-6">
                {sudsLetters.map(({ letter, label, description }) => (
                  <div key={label} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl font-extrabold text-indigo-600">
                      {letter}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything your practice needs</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              From first appointment to final invoice, Soap Suds handles the workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                <ul className="mt-4 space-y-1">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>


      <PricingSection />

      {/* White Label */}
      <section className="py-24 px-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                White Label
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Make it yours — your brand, your portal
              </h2>
              <p className="mt-4 text-lg text-indigo-100 leading-relaxed">
                SoloSuds fades into the background so your practice shines. Customize your logo, colors, and client-facing portal to match your brand — no "Powered by" watermarks.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Upload your own logo & favicon",
                  "Set your brand colors across the app",
                  "Custom email sender name & reply-to address",
                  "Branded client intake & document portal",
                  "Custom email signature on every message",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-indigo-100">
                    <CheckCircle className="h-4 w-4 shrink-0 text-white" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-8 space-y-5">
              <div className="flex items-center gap-3">
                <Palette className="h-8 w-8 text-white/80" />
                <div>
                  <p className="font-semibold text-white">Full Branding Control</p>
                  <p className="text-xs text-indigo-200">Logo, favicon, colors, fonts</p>
                </div>
              </div>
              <div className="h-px bg-white/10" />
              <div className="grid grid-cols-3 gap-3">
                {["#6366F1", "#0EA5E9", "#10B981"].map((color) => (
                  <div
                    key={color}
                    className="h-12 rounded-xl border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="text-xs text-indigo-200">Your clients see your brand — not ours.</p>
              <div className="rounded-xl bg-white/10 border border-white/20 p-4 text-sm">
                <p className="text-white font-medium">From: Missy&apos;s Massage Studio</p>
                <p className="text-indigo-200 text-xs mt-0.5">reply-to: hello@missysmassage.com</p>
                <p className="mt-2 text-indigo-100 text-xs">Hi Sarah, your intake form is ready…</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <AppFooter />
    </div>
  );
}

const soapLetters = [
  {
    letter: "S",
    label: "Subjective",
    description:
      "Captures the client's perspective — their reported feelings, symptoms, or concerns about their progress.",
  },
  {
    letter: "O",
    label: "Objective",
    description:
      "Measurable, observable data from the session: vital signs, test results, or specific non-biased observations by the professional.",
  },
  {
    letter: "A",
    label: "Assessment",
    description:
      "The practitioner interprets Subjective and Objective data to describe the client's progress, diagnose issues, or analyze changes in their condition.",
  },
  {
    letter: "P",
    label: "Plan",
    description:
      "Outlines the next steps — upcoming treatment, adjustments to the current plan, and recommendations for the client.",
  },
];

const sudsLetters = [
  {
    letter: "S",
    label: "Scheduling",
    description:
      "Online booking & calendar management — let clients book themselves while you stay in full control of your time.",
  },
  {
    letter: "U",
    label: "Unified",
    description:
      "Client profiles & full communication history in one place — everything you need to know about a client at a glance.",
  },
  {
    letter: "D",
    label: "Documentation",
    description:
      "The SOAP notes themselves — structured, stored securely, and accessible for every session.",
  },
  {
    letter: "S",
    label: "Sync",
    description:
      "Real-time updates across all your devices, with Google Calendar and Outlook integration built right in.",
  },
];

const features = [
  {
    title: "Smart Scheduling",
    icon: CalendarDays,
    description: "A full-featured calendar with client self-booking, automated reminders, and easy appointment management.",
    bullets: ["Self-serve online booking", "Email & SMS reminders", "Team calendar view", "Block & buffer times"],
  },
  {
    title: "Client Management",
    icon: Users,
    description: "Centralized client profiles with full history, paperless intake forms, and a secure document portal.",
    bullets: ["Digital intake forms", "Unlimited clients", "Secure messaging", "Tag & search"],
  },
  {
    title: "SOAP Notes",
    icon: FileText,
    description: "Write, sign, and store structured SOAP notes for every session — fast, organized, and always accessible.",
    bullets: ["SOAP & session note types", "Draft, sign & lock notes", "Note templates", "Amendment tracking"],
  },
  {
    title: "Billing & Invoicing",
    icon: CreditCard,
    description: "Create invoices, accept card payments, and track what's owed — all without leaving the app.",
    bullets: ["Stripe payment processing", "CPT code fields", "Invoice history", "Payment status tracking"],
  },
];


