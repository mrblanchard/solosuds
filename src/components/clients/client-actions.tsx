"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2, Archive, Loader2, MoreVertical, FileText, CalendarDays, Pencil, Mail, MessageSquare } from "lucide-react";

interface ClientActionsProps {
  clientId: string;
  clientName: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

export default function ClientActions({ clientId, clientName, hasEmail = false, hasPhone = false }: ClientActionsProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingLink, setSendingLink] = useState<"email" | "sms" | null>(null);
  const [linkSent, setLinkSent] = useState<"email" | "sms" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function sendBookingLink(method: "email" | "sms") {
    setSendingLink(method);
    try {
      const res = await fetch(`/api/clients/${clientId}/send-booking-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send");
      }
      setLinkSent(method);
      setTimeout(() => setLinkSent(null), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send booking link. Please try again.");
    } finally {
      setSendingLink(null);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const busy = isArchiving || isDeleting;

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
      router.push("/dashboard/clients");
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
      router.push("/dashboard/clients");
      router.refresh();
    } catch {
      alert("Failed to delete client. Please try again.");
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendBookingLink("email")}
          disabled={!hasEmail || sendingLink !== null}
          title={hasEmail ? "Email this client their online booking link" : "No email on file"}
        >
          {sendingLink === "email" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
          {linkSent === "email" ? "Sent!" : "Email Link"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sendBookingLink("sms")}
          disabled={!hasPhone || sendingLink !== null}
          title={hasPhone ? "Text this client their online booking link" : "No phone on file"}
        >
          {sendingLink === "sms" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
          {linkSent === "sms" ? "Sent!" : "Text Link"}
        </Button>
        <Link href={`/dashboard/clients/${clientId}/edit`}>
          <Button size="sm">Edit Profile</Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleArchive}
          disabled={busy}
          className="text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
        >
          {isArchiving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Archive className="h-4 w-4 mr-1" />
          )}
          Archive
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={busy}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Trash2 className="h-4 w-4 mr-1" />
          )}
          Delete
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
            <button
              onClick={() => { setMenuOpen(false); sendBookingLink("email"); }}
              disabled={!hasEmail || sendingLink !== null}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <Mail className="h-4 w-4" />
              Email Booking Link
            </button>
            <button
              onClick={() => { setMenuOpen(false); sendBookingLink("sms"); }}
              disabled={!hasPhone || sendingLink !== null}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <MessageSquare className="h-4 w-4" />
              Text Booking Link
            </button>
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
              onClick={() => { setMenuOpen(false); handleArchive(); }}
              disabled={busy}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
            >
              {isArchiving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              Archive
            </button>
            <button
              onClick={() => { setMenuOpen(false); handleDelete(); }}
              disabled={busy}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Permanently
            </button>
          </div>
        )}
      </div>
    </>
  );
}
