import Link from "next/link";
import { Button } from "@/components/ui/button";
import PricingSection from "@/components/pricing-section";
import LandingNav from "@/components/landing-nav";
import { AppFooter } from "@/components/layout/app-footer";
import {
  CalendarDays,
  Users,
  UserCog,
  FileText,
  ClipboardList,
  MessageSquare,
  Lock,
  CreditCard,
  Palette,
  LayoutDashboard,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  Stethoscope,
  Scissors,
  HeartPulse,
  Dumbbell,
  Music2,
  Briefcase,
} from "lucide-react";

export const metadata = {
  title: "Features | SoloSuds",
  description:
    "Every feature included with SoloSuds: scheduling, client management, notes, intake forms, messaging, billing, white label branding, and HIPAA-ready security.",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b-primary">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="SoloSuds" className="h-10 w-auto" />
              <span className="text-xl font-bold text-gray-800">SoloSuds</span>
            </Link>
          </div>
          <LandingNav />
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            The complete feature guide
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Everything SoloSuds does for your practice
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            One login for scheduling, notes, billing, messaging, and client records. Here is exactly
            what you and your clients get, feature by feature.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="px-8">
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/#pricing">
              <Button size="lg" variant="outline" className="px-8">
                View pricing
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Quick facts */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-5xl grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickFacts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-6 text-center"
            >
              <p className="text-sm font-bold text-indigo-600">{fact.value}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Practice types */}
      <section className="py-16 px-4 bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">
              Built for independent practitioners across industries
            </h2>
            <p className="mt-2 text-gray-500 max-w-xl mx-auto">
              Pick your practice type during setup and SoloSuds seeds starter services to match.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {practiceTypes.map((p) => (
              <div
                key={p.label}
                className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 inline-flex rounded-xl bg-indigo-50 p-2.5">
                  <p.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{p.label}</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{p.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full feature breakdown */}
      <section id="all-features" className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything, in detail</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Every feature below is included on every plan. No add-ons, no per-note fees.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featureSections.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                <ul className="mt-4 space-y-1.5">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* White Label spotlight */}
      <section className="py-24 px-4 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                White Label
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Make it yours. Your brand, your portal.
              </h2>
              <p className="mt-4 text-lg text-indigo-100 leading-relaxed">
                SoloSuds fades into the background so your practice shines. Customize your logo,
                colors, and client-facing portal to match your brand, with no &quot;Powered by&quot;
                watermarks.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Upload your own logo and favicon",
                  "Pick your brand color and font, applied across the whole app",
                  "Custom email sender name and reply-to address",
                  "Custom email signature on every message",
                  "Branded client intake, booking, and document portal",
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
              <p className="text-xs text-indigo-200">Your clients see your brand, not ours.</p>
              <div className="rounded-xl bg-white/10 border border-white/20 p-4 text-sm">
                <p className="text-white font-medium">From: Your Practice Name</p>
                <p className="text-indigo-200 text-xs mt-0.5">reply-to: hello@yourpractice.com</p>
                <p className="mt-2 text-indigo-100 text-xs">Hi Sarah, your intake form is ready…</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance spotlight */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border border-gray-200 bg-white p-8 space-y-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-indigo-600" />
                <div>
                  <p className="font-semibold text-gray-900">Built with compliance in mind</p>
                  <p className="text-xs text-gray-500">Encryption, audit trails, and consent</p>
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-gray-700">
                Every document upload and download is logged with a timestamp, so you always know
                who accessed what, and when.
              </div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-gray-700">
                Standard email is not fully encrypted, so SoloSuds gates PHI behind a signed
                client consent form before it is ever sent.
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                Security & Compliance
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Handle client information the right way
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                SoloSuds is designed for practitioners who handle sensitive client information
                every day, with the safeguards to match.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "HIPAA Business Associate Agreement (BAA) available for covered entities",
                  "Encrypted connections (HTTPS/TLS) and secure authentication throughout",
                  "Files encrypted at rest, with signed download links that expire after 15 minutes",
                  "Required email consent flow keeps protected health information off standard email until a client agrees",
                  "Strong password requirements: 12+ characters, mixed case, numbers, and symbols",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-indigo-100 bg-indigo-50 p-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Ready to see it running your practice?</h2>
          <p className="mt-2 text-gray-600">
            Start your free trial today. No credit card required, and you can cancel anytime.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="px-8">
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="mailto:support@solosuds.com?subject=Question%20about%20SoloSuds">
              <Button size="lg" variant="outline" className="px-8">
                Ask a question
              </Button>
            </a>
          </div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}

const quickFacts = [
  { value: "Unlimited", label: "Clients & SOAP notes on every plan" },
  { value: "6", label: "Practice types supported out of the box" },
  { value: "BAA", label: "HIPAA Business Associate Agreement available" },
  { value: "Minutes", label: "To set up. No IT department required" },
];

const practiceTypes = [
  { label: "Therapy & Bodywork", subtitle: "Massage, PT, chiropractic, acupuncture", icon: Stethoscope },
  { label: "Salon & Beauty", subtitle: "Hair, nails, esthetics, barbershop", icon: Scissors },
  { label: "Medical Practice", subtitle: "Clinics, mental health, specialists", icon: HeartPulse },
  { label: "Fitness & Wellness", subtitle: "Personal training, yoga, coaching", icon: Dumbbell },
  { label: "Lessons & Tutoring", subtitle: "Music, voice, tutoring, coaching", icon: Music2 },
  { label: "Other / General", subtitle: "Any independent practice", icon: Briefcase },
];

const featureSections = [
  {
    title: "Scheduling & Booking",
    icon: CalendarDays,
    description:
      "A full calendar with client self-booking, automated reminders, and effortless rescheduling.",
    bullets: [
      "Public self-booking page for clients",
      "Drag-and-drop calendar with buffer times",
      "Automatic email reminders & confirmations",
      "New bookings auto-create a draft session note",
      "Default intake form emailed automatically",
    ],
  },
  {
    title: "Client Management",
    icon: Users,
    description:
      "Centralized client profiles with full history, so nothing about a client is ever scattered across apps.",
    bullets: [
      "Unlimited active clients",
      "Contact, emergency contact & demographic info",
      "CSV import for up to 500 clients at once",
      "Tags, search & status filters",
      "Archive clients without losing their history",
    ],
  },
  {
    title: "Notes & Documentation",
    icon: FileText,
    description:
      "Write, sign, and store structured notes for every session, fast, organized, and always accessible.",
    bullets: [
      "SOAP notes or free-form session notes",
      "Draft, sign & lock notes for a clean audit trail",
      "Reusable note templates",
      "ICD-10 & CPT code fields for billing",
      "Duplicate a note for recurring sessions",
    ],
  },
  {
    title: "Digital Intake Forms",
    icon: ClipboardList,
    description:
      "Build custom forms once and let SoloSuds send and collect them for you automatically.",
    bullets: [
      "Drag-and-drop form builder, 7+ field types",
      "Auto-sent to clients the moment they book",
      "Shareable link, no login required for clients",
      "Submissions organized by client",
      "Duplicate forms to build variations fast",
    ],
  },
  {
    title: "Messaging & Email",
    icon: MessageSquare,
    description:
      "Text and email clients from one inbox, with the guardrails healthcare communication needs.",
    bullets: [
      "Two-way SMS through your own Twilio number",
      "Client replies land in your inbox in real time",
      "Optional forwarding to your own phone",
      "Signed consent flow gates PHI sent by email",
      "Consent status tracked per client",
    ],
  },
  {
    title: "Client Document Portal",
    icon: Lock,
    description:
      "A secure, password-free page where clients upload and download documents, no account required.",
    bullets: [
      "Your own portal link, e.g. solosuds.com/portal/you",
      "One-time 6-digit code verification",
      "Share files to clients or receive uploads from them",
      "AES-256 encryption at rest, signed 15-minute links",
      "Full audit log of every upload & download",
    ],
  },
  {
    title: "Billing & Invoicing",
    icon: CreditCard,
    description:
      "Create invoices, accept card payments, and track what's owed, all without leaving the app.",
    bullets: [
      "Invoices with line items in seconds",
      "Card payments online through Stripe",
      "Automatic payment status tracking",
      "Discount codes for promotions",
      "CPT code fields on every invoice",
    ],
  },
  {
    title: "White Label Branding",
    icon: Palette,
    description: "Make the app your own: your logo, your colors, your emails. Clients see your brand.",
    bullets: [
      "Upload logo & favicon",
      "Custom brand color & font",
      "Branded client portal & booking page",
      "Custom email sender name & signature",
    ],
  },
  {
    title: "Team Roles & Permissions",
    icon: UserCog,
    description: "Bring on staff without giving up control. Every role sees exactly what it should.",
    bullets: [
      "Owner, Admin, Practitioner & Staff roles",
      "Owners & admins manage settings and billing",
      "Practitioners see their own clients & schedule",
      "Invite teammates with a shareable link",
    ],
  },
  {
    title: "Dashboard & Tasks",
    icon: LayoutDashboard,
    description:
      "A dashboard that adapts to how you work, plus a built-in task manager to keep you on track.",
    bullets: [
      "Drag, resize & hide widgets to build your own layout",
      "At-a-glance counts, drafts, and today's schedule",
      "Task manager with priorities & status tracking",
      "Six color themes to match your taste",
    ],
  },
];
