"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordSchema, PASSWORD_RULES } from "@/lib/utils";
import { Turnstile } from "@marsidev/react-turnstile";

const registerSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required").max(200, "Organization name is too long"),
  name: z.string().min(2, "Your name is required").max(200, "Name is too long"),
  email: z.string().email("Invalid email address").max(254, "Email is too long"),
  password: passwordSchema,
  acceptBaa: z.boolean().refine((v) => v === true, {
    message: "You must accept the BAA to continue",
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  return <RegisterContent />;
}

function RegisterContent() {
  const router = useRouter();
  const [fromGoogle, setFromGoogle] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");
  const [prefillName, setPrefillName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteOrgName, setInviteOrgName] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<string | null>(null);
  const [cfToken, setCfToken] = useState<string | null>(null);

  const schema = fromGoogle
    ? registerSchema.extend({ password: z.string().optional() })
    : registerSchema;

  // When joining via invite, org name is not required
  const activeSchema = inviteCode
    ? schema.extend({ organizationName: z.string().optional() })
    : schema;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(activeSchema),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fg = params.get("fromGoogle") === "1";
    const email = params.get("email") ?? "";
    const name = params.get("name") ?? "";
    const invite = params.get("invite");
    const role = params.get("role");
    setFromGoogle(fg);
    if (email) { setPrefillEmail(email); setValue("email", email); }
    if (name) { setPrefillName(name); setValue("name", name); }
    if (invite) {
      setInviteCode(invite);
      if (role) setInviteRole(role);
      // Look up the org name for the invite code
      fetch(`/api/auth/invite-info?code=${encodeURIComponent(invite)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.organizationName) {
            setInviteOrgName(data.organizationName);
          } else {
            setError("Invalid or expired invite link");
            setInviteCode(null);
          }
        })
        .catch(() => {
          setError("Could not verify invite link");
          setInviteCode(null);
        });
    }
  }, [setValue]);

  async function onSubmit(data: RegisterForm) {
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, fromGoogle, inviteCode, role: inviteRole, cfToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Registration failed");
        return;
      }
      if (fromGoogle) {
        // Sign in via Google now that the account exists
        const { signIn } = await import("next-auth/react");
        await signIn("google", { callbackUrl: "/onboarding" });
      } else {
        router.push("/login?registered=1");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="SoapSuds" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {inviteCode ? "Join your team" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {inviteCode
              ? inviteOrgName
                ? `You've been invited to join ${inviteOrgName}`
                : "Verifying invite link…"
              : "Start your 14-day free trial — no credit card required"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {fromGoogle && (
            <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              Your Google account (<strong>{prefillEmail}</strong>) isn&apos;t registered yet. Complete the form below to create your free account.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!inviteCode && (
            <div>
              <Label htmlFor="organizationName">Practice / Organization name</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Sunrise Wellness Clinic"
                className="mt-1"
                {...register("organizationName")}
              />
              {errors.organizationName && (
                <p className="mt-1 text-xs text-red-600">{errors.organizationName.message}</p>
              )}
            </div>
            )}

            <div>
              <Label htmlFor="name">Your full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Dr. Jane Smith"
                className="mt-1"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@clinic.com"
                className="mt-1"
                readOnly={fromGoogle}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {!fromGoogle && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 12 characters"
                className="mt-1"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">{PASSWORD_RULES}</p>
            </div>
            )}

            <div className="flex items-start gap-3">
              <input
                id="acceptBaa"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                {...register("acceptBaa")}
              />
              <label htmlFor="acceptBaa" className="text-sm text-gray-600">
                I agree to the{" "}
                <Link href="/hipaa" className="text-indigo-600 hover:underline">
                  Business Associate Agreement
                </Link>
                {" "}and{" "}
                <Link href="/terms" className="text-indigo-600 hover:underline">
                  Terms of Service
                </Link>
              </label>
            </div>
            {errors.acceptBaa && (
              <p className="text-xs text-red-600">{errors.acceptBaa.message}</p>
            )}

            {!fromGoogle && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={(token) => setCfToken(token)}
                onExpire={() => setCfToken(null)}
                onError={() => setCfToken(null)}
                options={{ theme: "light" }}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || (!fromGoogle && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !cfToken)}
            >
              {isSubmitting
                ? fromGoogle ? "Creating account…" : "Creating account..."
                : fromGoogle ? "Create account & sign in with Google" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
