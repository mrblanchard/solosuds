"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface ClientActionsProps {
  clientId: string;
  clientName: string;
}

export default function ClientActions({ clientId, clientName }: ClientActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Archive "${clientName}"? This will hide them from active lists but preserve all their records.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to archive client: ${err?.error ?? "Unknown error"}`);
        return;
      }
      router.push("/dashboard/clients");
      router.refresh();
    } catch {
      alert("Failed to archive client. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin mr-1" />
      ) : (
        <Trash2 className="h-4 w-4 mr-1" />
      )}
      Archive
    </Button>
  );
}
