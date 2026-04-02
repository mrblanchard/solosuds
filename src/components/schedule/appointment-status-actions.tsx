"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

interface Props {
  appointmentId: string;
  currentStatus: string;
}

export default function AppointmentStatusActions({ appointmentId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const transitions = TRANSITIONS[currentStatus] ?? [];

  if (transitions.length === 0) {
    return <p className="text-sm text-gray-400">No further status changes available.</p>;
  }

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  const LABELS: Record<string, string> = {
    CONFIRMED: "Confirm",
    COMPLETED: "Mark Complete",
    CANCELLED: "Cancel",
    NO_SHOW: "Mark No-Show",
  };

  const VARIANTS: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
    CONFIRMED: "default",
    COMPLETED: "default",
    CANCELLED: "destructive",
    NO_SHOW: "outline",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={VARIANTS[status] ?? "outline"}
          disabled={loading}
          onClick={() => updateStatus(status)}
        >
          {LABELS[status] ?? status}
        </Button>
      ))}
    </div>
  );
}
