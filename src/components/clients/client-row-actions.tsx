"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Eye, Loader2 } from "lucide-react";

interface ClientRowActionsProps {
  clientId: string;
  clientName: string;
}

export default function ClientRowActions({ clientId, clientName }: ClientRowActionsProps) {
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
      router.refresh();
    } catch {
      alert("Failed to archive client. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/dashboard/clients/${clientId}`}
        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        <Eye className="h-3.5 w-3.5" />
        View
      </Link>
      <Link
        href={`/dashboard/clients/${clientId}/edit`}
        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Archive
      </button>
    </div>
  );
}
