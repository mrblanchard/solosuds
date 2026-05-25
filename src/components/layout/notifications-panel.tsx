"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CreditCard, MessageSquare, CalendarDays, CheckCheck } from "lucide-react";
import Link from "next/link";

type NotificationType = "invoice_paid" | "new_message" | "upcoming_appointment" | "new_appointment";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  timestamp: string;
  isNew: boolean;
}

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  invoice_paid: CreditCard,
  new_message: MessageSquare,
  upcoming_appointment: CalendarDays,
  new_appointment: CalendarDays,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  invoice_paid: "bg-green-100 text-green-600",
  new_message: "bg-blue-100 text-blue-600",
  upcoming_appointment: "bg-amber-100 text-amber-600",
  new_appointment: "bg-indigo-100 text-indigo-600",
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isNew: false })));
    setUnreadCount(0);
  }

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      // Mark as read after a brief delay to let the user see the badge
      setTimeout(markAllRead, 1500);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-1rem))] rounded-2xl border border-gray-100 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            )}
            {notifications.map((n) => {
              const Icon = TYPE_ICON[n.type];
              const colorClass = TYPE_COLOR[n.type];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    n.isNew ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                  {n.isNew && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
