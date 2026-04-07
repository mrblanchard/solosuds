"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Archive, Eye, Loader2 } from "lucide-react";

interface ClientRowActionsProps {
  clientId: string;
  clientName: string;
}

export default function ClientRowActions({ clientId, clientName }: ClientRowActionsProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleArchive() {
    if (!confirm(`Archive "${clientName}"? This will hide them from active lists but preserve all their records.`)) return;

    setIsArchiving(true);
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
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete "${clientName}"? This will remove ALL their records (notes, appointments, invoices, etc.) and CANNOT be undone.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}?permanent=true`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete client: ${err?.error ?? "Unknown error"}`);
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to delete client. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const busy = isArchiving || isDeleting;

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
        onClick={handleArchive}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
      >
        {isArchiving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
        Archive
      </button>
      <button
        onClick={handleDelete}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Delete
      </button>
    </div>
  );
}
