"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Turnstile } from "@marsidev/react-turnstile";

interface Props {
  orgSlug: string;
  orgName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/;

function validateContact(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter your email or phone number.";
  // If it looks like it contains an @ it must be a valid email
  if (v.includes("@")) {
    if (!EMAIL_RE.test(v)) return "Please enter a valid email address.";
  } else {
    if (!PHONE_RE.test(v)) return "Please enter a valid phone number.";
  }
  return null;
}

export default function PortalAccessForm({ orgSlug, orgName }: Props) {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cfToken, setCfToken] = useState<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateContact(contact);
    if (validationError) {
      setContactError(validationError);
      return;
    }
    setContactError(null);
    setLoading(true);

    const res = await fetch("/api/portal/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, contact, cfToken }),
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Something went wrong. Please try again.");
      return;
    }

    // Always navigate to verify — even if no client found (security: don't reveal)
    router.push(`/portal/${orgSlug}/verify?contact=${encodeURIComponent(contact)}`);
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Access your documents</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter the email address or phone number on file with {orgName}. We&apos;ll send you a
        one-time code to verify your identity.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="contact">Email address or phone number</Label>
          <Input
            id="contact"
            type="text"
            value={contact}
            onChange={(e) => { setContact(e.target.value); setContactError(null); }}
            onBlur={() => setContactError(validateContact(contact))}
            placeholder="jane@example.com or 555-555-5555"
            className="mt-1"
            autoComplete="email"
          />
          {contactError && (
            <p className="mt-1 text-xs text-red-500">{contactError}</p>
          )}
        </div>

        {siteKey && (
          <Turnstile
            siteKey={siteKey}
            onSuccess={(token) => setCfToken(token)}
            onExpire={() => setCfToken(null)}
            onError={() => setCfToken(null)}
            options={{ theme: "light" }}
          />
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !contact.trim() || (!!siteKey && !cfToken)}
        >
          {loading ? "Sending code…" : "Send verification code"}
        </Button>
      </form>

      <p className="mt-4 text-xs text-gray-400 text-center">
        Your identity is verified with a one-time code, no password or account required.
      </p>
    </div>
  );
}
