"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ResponsiveLayouts, LayoutItem } from "react-grid-layout";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CalendarDays,
  FileText,
  CreditCard,
  TrendingUp,
  Clock,
  Plus,
  ChevronRight,
  MessageSquare,
  Settings2,
  X,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import SavedToast from "@/components/ui/saved-toast";
import TaskManager from "@/components/dashboard/task-manager";

// ─── Dynamic import (v2 requires an explicit `width` prop) ─────────────────

const ResponsiveGridLayout = dynamic(
  () =>
    import("react-grid-layout").then((mod) => ({
      default: mod.ResponsiveGridLayout,
    })),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionId =
  | "stat-clients"
  | "stat-appointments"
  | "stat-notes"
  | "stat-invoices"
  | "schedule"
  | "quick-actions"
  | "recent-notes"
  | "upcoming"
  | "messages"
  | "tasks";

const ALL_SECTIONS: SectionId[] = [
  "stat-clients",
  "stat-appointments",
  "stat-notes",
  "stat-invoices",
  "schedule",
  "quick-actions",
  "recent-notes",
  "upcoming",
  "messages",
  "tasks",
];

const DEFAULT_ACTIVE: SectionId[] = [
  "stat-clients",
  "stat-appointments",
  "stat-notes",
  "stat-invoices",
  "schedule",
  "quick-actions",
  "tasks",
];

type SectionMeta = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SECTION_META: Record<SectionId, SectionMeta> = {
  "stat-clients":      { title: "Active Clients",         description: "Count of active clients",             icon: Users },
  "stat-appointments": { title: "Today's Appointments",   description: "Appointments scheduled today",         icon: CalendarDays },
  "stat-notes":        { title: "Draft Notes",            description: "Notes awaiting completion",            icon: FileText },
  "stat-invoices":     { title: "Outstanding Invoices",   description: "Total unpaid invoice balance",         icon: CreditCard },
  schedule:            { title: "Today's Schedule",       description: "Full appointment timeline for today",  icon: CalendarDays },
  "quick-actions":     { title: "Quick Actions",          description: "Common shortcuts and actions",         icon: TrendingUp },
  "recent-notes":      { title: "Recent Notes",           description: "Latest SOAP notes across all clients", icon: FileText },
  upcoming:            { title: "Upcoming Appointments",  description: "Next 7 days schedule",                 icon: CalendarDays },
  messages:            { title: "Recent Messages",        description: "Latest client messages",               icon: MessageSquare },
  tasks:               { title: "Tasks",                  description: "To-do list and task management",        icon: FileText },
};

// ─── Default grid layouts ─────────────────────────────────────────────────────
// rowHeight=50px, so h:3 = 150px visible, h:9 = 450px visible

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: "stat-clients",      x: 0,  y: 0,  w: 3,  h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "stat-appointments", x: 3,  y: 0,  w: 3,  h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "stat-notes",        x: 6,  y: 0,  w: 3,  h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "stat-invoices",     x: 9,  y: 0,  w: 3,  h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "schedule",          x: 0,  y: 3,  w: 6,  h: 9, minW: 3, minH: 4 },
    { i: "quick-actions",     x: 6,  y: 3,  w: 6,  h: 9, minW: 3, minH: 4 },
    { i: "tasks",             x: 0,  y: 12, w: 6,  h: 11, minW: 3, minH: 6 },
    { i: "recent-notes",      x: 6,  y: 12, w: 6,  h: 9, minW: 3, minH: 4 },
    { i: "upcoming",          x: 0,  y: 23, w: 6,  h: 9, minW: 3, minH: 4 },
    { i: "messages",          x: 6,  y: 23, w: 6, h: 8, minW: 3, minH: 4 },
  ],
  md: [
    { i: "stat-clients",      x: 0, y: 0,  w: 4, h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "stat-appointments", x: 4, y: 0,  w: 4, h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "stat-notes",        x: 0, y: 3,  w: 4, h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "stat-invoices",     x: 4, y: 3,  w: 4, h: 3, minW: 2, minH: 2, maxH: 4 },
    { i: "schedule",          x: 0, y: 6,  w: 8, h: 9, minW: 3, minH: 4 },
    { i: "quick-actions",     x: 0, y: 15, w: 8, h: 8, minW: 3, minH: 4 },
    { i: "tasks",             x: 0, y: 23, w: 8, h: 11, minW: 3, minH: 6 },
    { i: "recent-notes",      x: 0, y: 34, w: 8, h: 9, minW: 3, minH: 4 },
    { i: "upcoming",          x: 0, y: 43, w: 8, h: 9, minW: 3, minH: 4 },
    { i: "messages",          x: 0, y: 52, w: 8, h: 8, minW: 3, minH: 4 },
  ],
  sm: [
    { i: "stat-clients",      x: 0, y: 0,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "stat-appointments", x: 2, y: 0,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "stat-notes",        x: 0, y: 3,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "stat-invoices",     x: 2, y: 3,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "schedule",          x: 0, y: 6,  w: 4, h: 9, minW: 2, minH: 4 },
    { i: "quick-actions",     x: 0, y: 15, w: 4, h: 8, minW: 2, minH: 4 },
    { i: "tasks",             x: 0, y: 23, w: 4, h: 11, minW: 2, minH: 6 },
    { i: "recent-notes",      x: 0, y: 34, w: 4, h: 9, minW: 2, minH: 4 },
    { i: "upcoming",          x: 0, y: 43, w: 4, h: 9, minW: 2, minH: 4 },
    { i: "messages",          x: 0, y: 52, w: 4, h: 8, minW: 2, minH: 4 },
  ],
  xs: [
    { i: "stat-clients",      x: 0, y: 0,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "stat-appointments", x: 2, y: 0,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "stat-notes",        x: 0, y: 3,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "stat-invoices",     x: 2, y: 3,  w: 2, h: 3, minW: 1, minH: 2, maxH: 4 },
    { i: "schedule",          x: 0, y: 6,  w: 4, h: 9, minW: 2, minH: 4 },
    { i: "quick-actions",     x: 0, y: 15, w: 4, h: 8, minW: 2, minH: 4 },
    { i: "tasks",             x: 0, y: 23, w: 4, h: 11, minW: 2, minH: 6 },
    { i: "recent-notes",      x: 0, y: 34, w: 4, h: 9, minW: 2, minH: 4 },
    { i: "upcoming",          x: 0, y: 43, w: 4, h: 9, minW: 2, minH: 4 },
    { i: "messages",          x: 0, y: 52, w: 4, h: 8, minW: 2, minH: 4 },
  ],
};

// ─── Persistence ──────────────────────────────────────────────────────────────

interface StoredState {
  layouts: ResponsiveLayouts;
  hidden: SectionId[];
}

function storageKey(userId: string) {
  return `dashboard-layout-v2:${userId}`;
}

function loadState(userId: string): StoredState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState;
      if (parsed.layouts && Array.isArray(parsed.hidden)) {
        const hidden = (parsed.hidden as string[]).filter((id): id is SectionId =>
          ALL_SECTIONS.includes(id as SectionId)
        );
        // Collect all known section IDs from layouts
        const layoutItems = Object.values(parsed.layouts)
          .flat()
          .filter((l): l is LayoutItem => l != null);
        const knownIds = new Set<string>([
          ...layoutItems.map((l) => l.i),
          ...hidden,
        ]);
        // Newly added sections default to hidden until user shows them
        const newSections = ALL_SECTIONS.filter((id) => !knownIds.has(id));
        return { layouts: parsed.layouts, hidden: [...hidden, ...newSections] };
      }
    }
  } catch {
    // ignore
  }
  return {
    layouts: DEFAULT_LAYOUTS,
    hidden: ALL_SECTIONS.filter((id) => !DEFAULT_ACTIVE.includes(id)),
  };
}

function saveState(userId: string, state: StoredState) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

// ─── Data types passed from the server page ───────────────────────────────────

export interface DashboardAppt {
  id: string;
  startTime: Date | string;
  status: string;
  service?: { name: string } | null;
  client: { firstName: string; lastName: string };
}

export interface DashboardNote {
  id: string;
  sessionDate: Date | string;
  status: string;
  client: { firstName: string; lastName: string };
}

export interface DashboardMessage {
  id: string;
  content: string;
  createdAt: Date | string;
  direction: string;
  client?: { firstName: string; lastName: string } | null;
}

export interface DashboardWidgetsProps {
  userId: string;
  userName: string;
  clientCount: number;
  draftNotes: number;
  pendingInvoicesTotal: number;
  todayAppts: DashboardAppt[];
  recentNotes: DashboardNote[];
  upcomingAppts: DashboardAppt[];
  recentMessages: DashboardMessage[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ApptBadge({ status }: { status: string }) {
  type Variant = "default" | "success" | "warning" | "secondary" | "destructive";
  const map: Record<string, { variant: Variant; label: string }> = {
    SCHEDULED:   { variant: "secondary",   label: "Scheduled" },
    CONFIRMED:   { variant: "default",     label: "Confirmed" },
    IN_PROGRESS: { variant: "warning",     label: "In Progress" },
    COMPLETED:   { variant: "success",     label: "Completed" },
    CANCELLED:   { variant: "destructive", label: "Cancelled" },
    NO_SHOW:     { variant: "destructive", label: "No Show" },
  };
  const c = map[status] ?? { variant: "secondary" as Variant, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

// Card that fills its grid cell; content scrolls to reveal more items when taller
function ListCard({ title, viewHref, action, children }: {
  title: string;
  viewHref?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between shrink-0 py-3 px-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-3">
          {action}
          {viewHref && (
            <Link
              href={viewHref}
              className="text-sm text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
            >
              View all →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-0 px-4 pb-3 pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { href: "/dashboard/notes/new",    label: "New SOAP Note",    description: "Start a session note",  Icon: FileText    },
  { href: "/dashboard/schedule/new", label: "Book Appointment", description: "Schedule a client",     Icon: CalendarDays },
  { href: "/dashboard/clients/new",  label: "Add Client",       description: "Register new client",   Icon: Users       },
  { href: "/dashboard/billing/new",  label: "Create Invoice",   description: "Bill for services",     Icon: TrendingUp  },
];

// ─── Skeleton shown while grid is not yet mounted ─────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardWidgets({
  userId,
  clientCount,
  draftNotes,
  pendingInvoicesTotal,
  todayAppts,
  recentNotes,
  upcomingAppts,
  recentMessages,
}: DashboardWidgetsProps) {
  const [state, setState] = useState<StoredState>({
    layouts: DEFAULT_LAYOUTS,
    hidden: ALL_SECTIONS.filter((id) => !DEFAULT_ACTIVE.includes(id)),
  });
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // Callback ref: fires when the container div actually mounts in the DOM
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up previous observer
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    containerRef.current = node;
    if (node) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      ro.observe(node);
      roRef.current = ro;
    }
  }, []);

  useEffect(() => {
    setState(loadState(userId));
    setMounted(true);
  }, [userId]);

  function handleLayoutChange(
    _layout: readonly LayoutItem[],
    allLayouts: ResponsiveLayouts
  ) {
    const next = { ...state, layouts: allLayouts };
    setState(next);
    saveState(userId, next);
    setSaveCount((c) => c + 1);
  }

  function hideSection(id: SectionId) {
    const next = { ...state, hidden: [...state.hidden, id] };
    setState(next);
    saveState(userId, next);
  }

  function showSection(id: SectionId) {
    const next = { ...state, hidden: state.hidden.filter((s) => s !== id) };
    setState(next);
    saveState(userId, next);
  }

  const visibleIds = ALL_SECTIONS.filter((id) => !state.hidden.includes(id));

  // Filter each breakpoint's layout array to only include visible sections
  const activeLayouts: ResponsiveLayouts = Object.fromEntries(
    Object.entries(state.layouts).map(([bp, items]) => [
      bp,
      (items as LayoutItem[]).filter((item) =>
        visibleIds.includes(item.i as SectionId)
      ),
    ])
  );

  // ─── Section renders ────────────────────────────────────────────────────────

  const sections: Record<SectionId, React.ReactNode> = {
    "stat-clients": (
      <Link href="/dashboard/clients" className="h-full block">
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex h-full items-center gap-4 p-5">
            <div className="rounded-xl p-3 bg-blue-50 shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clientCount}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          </CardContent>
        </Card>
      </Link>
    ),

    "stat-appointments": (
      <Link href="/dashboard/schedule" className="h-full block">
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex h-full items-center gap-4 p-5">
            <div className="rounded-xl p-3 bg-green-50 shrink-0">
              <CalendarDays className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Today&apos;s Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{todayAppts.length}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          </CardContent>
        </Card>
      </Link>
    ),

    "stat-notes": (
      <Link href="/dashboard/notes?status=DRAFT" className="h-full block">
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex h-full items-center gap-4 p-5">
            <div className="rounded-xl p-3 bg-yellow-50 shrink-0">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Draft Notes</p>
              <p className="text-2xl font-bold text-gray-900">{draftNotes}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          </CardContent>
        </Card>
      </Link>
    ),

    "stat-invoices": (
      <Link href="/dashboard/billing" className="h-full block">
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="flex h-full items-center gap-4 p-5">
            <div className="rounded-xl p-3 bg-purple-50 shrink-0">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Outstanding Invoices</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(pendingInvoicesTotal)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          </CardContent>
        </Card>
      </Link>
    ),

    schedule: (
      <ListCard title="Today&apos;s Schedule" viewHref="/dashboard/schedule">
        {todayAppts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No appointments today</p>
            <Link
              href="/dashboard/schedule/new"
              className="mt-2 text-sm text-indigo-600 hover:underline"
            >
              Schedule one →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAppts.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {appt.client.firstName} {appt.client.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {appt.service?.name ?? "Session"} · {formatDateTime(appt.startTime)}
                  </p>
                </div>
                <ApptBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </ListCard>
    ),

    "quick-actions": (
      <ListCard title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-start rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <action.Icon className="h-6 w-6 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">{action.label}</span>
              <span className="text-xs text-gray-500 mt-0.5">{action.description}</span>
            </Link>
          ))}
        </div>
      </ListCard>
    ),

    "recent-notes": (
      <ListCard
        title="Recent Notes"
        viewHref="/dashboard/notes"
        action={
          <Link
            href="/dashboard/notes/new"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="h-4 w-4" /> New
          </Link>
        }
      >
        {recentNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No notes yet</p>
            <Link
              href="/dashboard/notes/new"
              className="mt-2 text-sm text-indigo-600 hover:underline"
            >
              Start first note →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/dashboard/notes/${note.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {note.client.firstName} {note.client.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(note.sessionDate)}</p>
                </div>
                <Badge variant={note.status === "SIGNED" ? "success" : "warning"}>
                  {note.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </ListCard>
    ),

    upcoming: (
      <ListCard
        title="Upcoming Appointments"
        viewHref="/dashboard/schedule"
        action={
          <Link
            href="/dashboard/schedule/new"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="h-4 w-4" /> Book
          </Link>
        }
      >
        {upcomingAppts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No upcoming appointments</p>
            <Link
              href="/dashboard/schedule/new"
              className="mt-2 text-sm text-indigo-600 hover:underline"
            >
              Schedule one →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingAppts.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {appt.client.firstName} {appt.client.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {appt.service?.name ?? "Session"} · {formatDateTime(appt.startTime)}
                  </p>
                </div>
                <ApptBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </ListCard>
    ),

    messages: (
      <ListCard title="Recent Messages" viewHref="/dashboard/messages">
        {recentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMessages.map((msg) => (
              <Link
                key={msg.id}
                href="/dashboard/messages"
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {msg.client
                        ? `${msg.client.firstName} ${msg.client.lastName}`
                        : "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400 shrink-0">
                      {formatDate(msg.createdAt, "MMM d")}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{msg.content}</p>
                </div>
                <Badge variant={msg.direction === "INBOUND" ? "default" : "secondary"}>
                  {msg.direction === "INBOUND" ? "In" : "Out"}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </ListCard>
    ),

    tasks: (
      <ListCard title="Tasks">
        <TaskManager />
      </ListCard>
    ),
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!mounted) {
    return <DashboardSkeleton />;
  }

  return (
    <div ref={setContainerRef}>
      {containerWidth > 0 && (
      <ResponsiveGridLayout
        className="layout"
        width={containerWidth}
        layouts={activeLayouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 8, sm: 4, xs: 4, xxs: 2 }}
        rowHeight={50}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        dragConfig={{ enabled: true, handle: ".drag-handle" }}
      >
        {visibleIds.map((id) => (
          <div key={id} className="group relative">
            {/* Drag handle — GripVertical, visible on hover */}
            <div
              className="drag-handle absolute inset-x-2 top-1 z-10 h-5 cursor-grab active:cursor-grabbing rounded-t-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity touch-none select-none"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-gray-500 pointer-events-none" />
            </div>

            {/* Hide button — appears on card hover */}
            <button
              onClick={() => hideSection(id)}
              className="absolute top-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-md text-transparent opacity-0 group-hover:opacity-100 group-hover:text-gray-400 hover:!text-red-500 hover:bg-red-50 transition-all"
              title="Hide section"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="h-full">{sections[id]}</div>
          </div>
        ))}
      </ResponsiveGridLayout>
      )}

      {/* Floating customize button */}
      <button
        onClick={() => setCustomizeOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Customize</span>
      </button>

      {/* Customize side drawer */}
      {customizeOpen && (
        <>
          <div
            className="fixed inset-x-0 top-0 h-dvh z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setCustomizeOpen(false)}
          />
          <div className="fixed right-0 top-0 h-dvh z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Customize Dashboard
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Drag cards to rearrange · Resize from corners
                </p>
              </div>
              <button
                onClick={() => setCustomizeOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {visibleIds.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Visible Sections
                  </p>
                  <div className="space-y-2">
                    {visibleIds.map((id) => {
                      const meta = SECTION_META[id];
                      const Icon = meta.icon;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
                        >
                          <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {meta.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {meta.description}
                            </p>
                          </div>
                          <button
                            onClick={() => hideSection(id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Hide"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {state.hidden.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    Add Sections
                  </p>
                  <div className="space-y-2">
                    {state.hidden.map((id) => {
                      const meta = SECTION_META[id];
                      const Icon = meta.icon;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3"
                        >
                          <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-500 truncate">
                              {meta.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {meta.description}
                            </p>
                          </div>
                          <button
                            onClick={() => showSection(id)}
                            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4 shrink-0">
              <button
                onClick={() => setCustomizeOpen(false)}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
      <SavedToast show={saveCount > 0} key={saveCount} message="Layout saved" />
    </div>
  );
}
