"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResumeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleResume() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/account/subscription", { method: "PUT" });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to resume membership. Please contact support.");
    }
  }

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <Button
        onClick={handleResume}
        disabled={loading}
        size="lg"
        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
      >
        <PlayCircle className="h-5 w-5" />
        {loading ? "Resuming…" : "Resume membership"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
