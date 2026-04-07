"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export default function BulkActionsBar({ selectedIds, onClear }: BulkActionsBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBulk(action: "archive" | "delete") {
    const label = action === "delete" ? "permanently delete" : "archive";
    const warning = action === "delete"
      ? `Permanently delete ${selectedIds.length} client(s)? This will remove ALL their records (notes, appointments, invoices, etc.) and CANNOT be undone.`
      : `Archive ${selectedIds.length} client(s)? They will be hidden from active lists but their records will be preserved.`;

    if (!confirm(warning)) return;

    setLoading(action);
    try {
      const res = await fetch("/api/clients/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to ${label}: ${err?.error ?? "Unknown error"}`);
        return;
      }
      onClear();
      router.refresh();
    } catch {
      alert(`Failed to ${label}. Please try again.`);
    } finally {
      setLoading(null);
    }
  }

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2">
      <span className="text-sm font-medium text-indigo-700">
        {selectedIds.length} selected
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleBulk("archive")}
        disabled={loading !== null}
        className="text-amber-700 border-amber-300 hover:bg-amber-50"
      >
        {loading === "archive" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : (
          <Archive className="h-3.5 w-3.5 mr-1" />
        )}
        Archive
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleBulk("delete")}
        disabled={loading !== null}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        {loading === "delete" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 mr-1" />
        )}
        Delete Permanently
      </Button>
      <button
        onClick={onClear}
        className="ml-auto text-xs text-gray-500 hover:text-gray-700"
      >
        Clear
      </button>
    </div>
  );
}
