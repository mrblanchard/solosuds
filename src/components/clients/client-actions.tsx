"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, MoreVertical, FileText, CalendarDays, Pencil } from "lucide-react";

interface ClientActionsProps {
  clientId: string;
  clientName: string;
}

export default function ClientActions({ clientId, clientName }: ClientActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <>
      {/* Desktop: show all buttons inline */}
      <div className="hidden sm:flex gap-2">
        <Link href={`/dashboard/notes/new?clientId=${clientId}`}>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            New Note
          </Button>
        </Link>
        <Link href={`/dashboard/schedule/new?clientId=${clientId}`}>
          <Button variant="outline" size="sm">
            <CalendarDays className="h-4 w-4 mr-1" />
            Book Appt
          </Button>
        </Link>
        <Link href={`/dashboard/clients/${clientId}/edit`}>
          <Button size="sm">Edit Profile</Button>
        </Link>
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
      </div>

      {/* Mobile: hamburger dropdown */}
      <div className="relative sm:hidden" ref={menuRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-lg py-1">
            <Link
              href={`/dashboard/notes/new?clientId=${clientId}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              <FileText className="h-4 w-4" />
              New Note
            </Link>
            <Link
              href={`/dashboard/schedule/new?clientId=${clientId}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              <CalendarDays className="h-4 w-4" />
              Book Appt
            </Link>
            <Link
              href={`/dashboard/clients/${clientId}/edit`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Link>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { setMenuOpen(false); handleDelete(); }}
              disabled={isDeleting}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Archive
            </button>
          </div>
        )}
      </div>
    </>
  );
}
