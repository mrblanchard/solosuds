"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppFooter } from "@/components/layout/app-footer";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { CaptchaHint } from "@/components/auth/captcha-hint";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [cfToken, setCfToken] = useState<string | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), cfToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        turnstileRef.current?.reset();
        setCfToken(null);
        return;
      }
      setSentTo(email.trim());
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Link href="/">
              <img src="/logo.png" alt="Booked & Noted" className="h-auto w-56 sm:w-72 mb-2" />
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {sentTo ? (
              <div className="text-center">
                <MailCheck className="mx-auto mb-3 h-10 w-10 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
                <p className="mt-3 text-sm text-gray-600">
                  If <strong>{sentTo}</strong> has a Booked &amp; Noted account, we just sent it a link to
                  reset your password. The link expires in 1 hour.
                </p>
                <p className="mt-3 text-sm text-gray-500">
                  Nothing after a few minutes? Check your spam folder, make sure the address is the one you
                  signed up with, or email{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-600 hover:text-indigo-700">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => setSentTo(null)}
                  className="mt-5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900">Reset your password</h2>
                <p className="mt-1 mb-6 text-sm text-gray-500">
                  Enter the email you signed up with and we&apos;ll send you a link to choose a new password.
                </p>

                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5"
                      placeholder="you@example.com"
                    />
                  </div>

                  {SITE_KEY && (
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={SITE_KEY}
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
                  {SITE_KEY && <CaptchaHint waiting={!cfToken} failed={captchaFailed} />}

                  <Button type="submit" className="w-full" disabled={submitting || (!!SITE_KEY && !cfToken)}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send reset link
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                  Signed up with Google? You don&apos;t need a password.{" "}
                  <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
                    Back to sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
