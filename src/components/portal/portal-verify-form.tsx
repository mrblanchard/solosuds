"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  orgSlug: string;
  contact: string;
}

export default function PortalVerifyForm({ orgSlug, contact }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/portal/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgSlug, contact, code: code.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("That code is incorrect or has expired. Please check the code and try again.");
      return;
    }

    router.push(`/portal/${orgSlug}/files`);
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Enter your code</h2>
      <p className="text-sm text-gray-500 mb-6">
        We sent a 6-digit code to <strong>{contact}</strong>. It expires in 15 minutes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="mt-1 text-center text-2xl tracking-widest font-mono"
            required
            autoComplete="one-time-code"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? "Verifying…" : "Verify & access files"}
        </Button>
      </form>

      <p className="mt-4 text-xs text-center">
        <a href={`/portal/${orgSlug}`} className="text-indigo-600 hover:underline">
          Use a different email or phone number
        </a>
      </p>
    </div>
  );
}
