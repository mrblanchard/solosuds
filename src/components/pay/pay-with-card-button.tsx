"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  token: string;
  color: string;
}

export default function PayWithCardButton({ token, color }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pay/${token}/checkout-session`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading} size="lg" className="w-full" style={{ background: color }}>
        {loading ? "Redirecting..." : "Pay with Card"}
      </Button>
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
