"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const schema = z.object({
  email: z.string().email("Invalid email address").max(254, "Email is too long"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

/** Validates that a callbackUrl is a safe relative path to prevent open redirects. */
function getSafeCallbackUrl(raw: string | null): string {
  if (!raw) return "/dashboard";
  try {
    // Allow only relative paths (no protocol/host)
    const url = new URL(raw, "http://localhost");
    if (url.origin !== "http://localhost") return "/dashboard";
    return url.pathname + url.search;
  } catch {
    return "/dashboard";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [urlErrorMessage, setUrlErrorMessage] = useState<string | null>(null);
  const [cfToken, setCfToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  // Read URL error only after mount to avoid server/client hydration mismatch
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (!urlError) return;
    const messages: Record<string, string> = {
      OAuthAccountNotLinked:
        "No account found for this Google address. Please sign up for a free trial first.",
      OAuthSignin:
        "No account found for this Google address. Please sign up for a free trial first.",
      OAuthCallback:
        "No account found for this Google address. Please sign up for a free trial first.",
      CredentialsSignin: "Invalid email or password.",
    };
    setUrlErrorMessage(messages[urlError] ?? "Sign-in failed. Please try again.");
  }, [searchParams]);

  const urlError = searchParams.get("error");
  const error = formError ?? urlErrorMessage;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    setFormError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        cfToken: cfToken ?? "",
        redirect: false,
      });

      if (result?.error) {
        setFormError("Invalid email or password.");
        // Reset CAPTCHA so user must solve it again
        turnstileRef.current?.reset();
        setCfToken(null);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <img src="/logo.png" alt="SoloSuds" className="h-auto w-56 sm:w-72 mb-2" />
          </Link>
          <p className="mt-1 text-sm text-gray-500">
            Care without the chaos
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
              {urlError === "OAuthAccountNotLinked" && (
                <Link
                  href="/register"
                  className="block mt-2 font-medium text-indigo-600 hover:text-indigo-700"
                >
                  → Start your free trial
                </Link>
              )}
            </div>
          )}

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className="mt-1.5"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className="mt-1.5"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                ref={turnstileRef}
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
              disabled={isLoading || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !cfToken)}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Start free trial
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Your data is private and secure
        </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-gray-50" />}>
      <LoginForm />
    </Suspense>
  );
}
