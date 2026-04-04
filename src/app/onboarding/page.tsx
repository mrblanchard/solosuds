"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { AppFooter } from "@/components/layout/app-footer";

type PracticeType = "THERAPY" | "SALON" | "MEDICAL" | "FITNESS" | "OTHER";

interface PracticeOption {
  type: PracticeType;
  emoji: string;
  label: string;
  subtitle: string;
  features: string[];
}

const PRACTICE_OPTIONS: PracticeOption[] = [
  {
    type: "THERAPY",
    emoji: "🫱",
    label: "Therapy & Bodywork",
    subtitle: "Massage, physical therapy, chiropractic, acupuncture",
    features: ["SOAP notes & session tracking", "Client intake forms", "Appointment booking", "HIPAA-ready"],
  },
  {
    type: "SALON",
    emoji: "✂️",
    label: "Salon & Beauty",
    subtitle: "Hair salon, nail salon, esthetics, barbershop",
    features: ["Fast rebooking & scheduling", "Service menu & pricing", "Client profiles", "Invoicing & payments"],
  },
  {
    type: "MEDICAL",
    emoji: "🩺",
    label: "Medical Practice",
    subtitle: "Doctor's office, clinic, mental health, specialist",
    features: ["HIPAA compliance tools", "Patient intake forms", "Detailed clinical notes", "Secure messaging"],
  },
  {
    type: "FITNESS",
    emoji: "🏋️",
    label: "Fitness & Wellness",
    subtitle: "Personal training, yoga, pilates, coaching",
    features: ["Class & session scheduling", "Package & membership billing", "Client progress tracking", "Appointment reminders"],
  },
  {
    type: "OTHER",
    emoji: "💼",
    label: "Other / General",
    subtitle: "Something else — get a clean slate",
    features: ["Full access to all features", "Customize as you go", "No assumptions about your workflow"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [practiceType, setPracticeType] = useState<PracticeType | null>(null);
  const [name, setName] = useState("");
  const [noteType, setNoteType] = useState<"SOAP" | "SESSION">("SOAP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !practiceType) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), practiceType, noteType }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const selected = PRACTICE_OPTIONS.find((o) => o.type === practiceType);

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  step > n
                    ? "bg-indigo-600 text-white"
                    : step === n
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span className={`text-sm ${step === n ? "font-medium text-gray-900" : "text-gray-400"}`}>
                {n === 1 ? "Practice type" : "Practice name"}
              </span>
              {n < 2 && <ChevronRight className="h-4 w-4 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Choose practice type ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">What type of practice do you run?</h1>
              <p className="mt-1 text-sm text-gray-500">
                We'll tailor your dashboard, starter services, and default features to match your workflow.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PRACTICE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setPracticeType(opt.type)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/40 ${
                    practiceType === opt.type
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {practiceType === opt.type && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <div className="text-2xl mb-2">{opt.emoji}</div>
                  <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{opt.subtitle}</p>
                  <ul className="mt-2 space-y-0.5">
                    {opt.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="h-1 w-1 rounded-full bg-indigo-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!practiceType}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Practice name ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{selected?.emoji}</span>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selected?.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Name your practice</h1>
              <p className="mt-1 text-sm text-gray-500">
                This is how you'll appear to clients and in your account. You can change it in Settings later.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Practice name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    practiceType === "THERAPY" ? "e.g. Stillwater Massage Therapy" :
                    practiceType === "SALON"   ? "e.g. The Gilded Chair Salon" :
                    practiceType === "MEDICAL" ? "e.g. Riverside Family Practice" :
                    practiceType === "FITNESS" ? "e.g. Peak Performance Training" :
                    "e.g. My Practice"
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note format
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Choose your preferred note format. You can change this later in Settings.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "SOAP" as const, label: "SOAP Notes", desc: "Subjective, Objective, Assessment, Plan" },
                    { value: "SESSION" as const, label: "Session Notes", desc: "Free-form session documentation" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNoteType(opt.value)}
                      className={`rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                        noteType === opt.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium text-gray-900">{opt.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Setting up your practice…" : "Launch my dashboard →"}
              </button>
            </form>
          </div>
        )}
      </div>
      </div>
      <AppFooter />
    </div>
  );
}

