"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { signIn, signOut } from "next-auth/react";
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
import { loginErrorMessage } from "@/lib/login-errors";
import { GoogleIcon } from "@/components/auth/google-icon";
import { CaptchaHint } from "@/components/auth/captcha-hint";

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
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  // Read URL error only after mount to avoid server/client hydration mismatch
  useEffect(() => {
    setUrlErrorMessage(loginErrorMessage(searchParams.get("error"), searchParams.get("code")));
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
        setFormError(loginErrorMessage(result.error, result.code));
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
    // Clear any leftover session first. If this browser is still signed in as
    // a different user, Auth.js refuses the Google callback with
    // OAuthAccountNotLinked instead of switching accounts.
    await signOut({ redirect: false }).catch(() => {});
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <img src="/logo.png" alt="Booked & Noted" className="h-auto w-56 sm:w-72 mb-2" />
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
              <GoogleIcon />
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
                onSuccess={(token) => {
                  setCfToken(token);
                  setCaptchaFailed(false);
                }}
                onExpire={() => setCfToken(null)}
                onError={() => {
                  setCfToken(null);
                  setCaptchaFailed(true);
                }}
                options={{ theme: "light" }}
              />
            )}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <CaptchaHint waiting={!cfToken} failed={captchaFailed} />
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
