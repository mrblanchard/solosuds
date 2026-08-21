"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, FileText, CalendarDays, CreditCard, Plus } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ClientContactCard } from "@/components/clients/client-contact-card";
import ClientDocuments from "@/components/clients/client-documents";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionId = "contact" | "notes" | "appointments" | "invoices" | "documents";
const DEFAULT_ORDER: SectionId[] = ["contact", "notes", "appointments", "invoices", "documents"];

interface SoapNote {
  id: string;
  sessionDate: Date | string;
  status: string;
  practitioner: { name: string | null };
}

interface Appointment {
  id: string;
  startTime: Date | string;
  status: string;
  service?: { name: string } | null;
  practitioner: { name: string | null } | null;
}

interface Invoice {
  id: string;
  number: string;
  createdAt: Date | string;
  total: number;
  status: string;
}

interface Tag {
  id: string;
  name: string;
}

export interface ClientSectionsProps {
  userId: string;
  clientId: string;
  // Contact card props
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  tags?: Tag[];
  internalNotes?: string | null;
  // Section data
  soapNotes: SoapNote[];
  appointments: Appointment[];
  invoices: Invoice[];
  orgSlug: string;
  documents: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    direction: "CLIENT_TO_PRACTICE" | "PRACTICE_TO_CLIENT";
    uploadedBy: string | null;
    createdAt: string | Date;
  }[];
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function storageKey(userId: string) {
  return `client-sections-order:${userId}`;
}

function loadOrder(userId: string): SectionId[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_ORDER;
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_ORDER.length &&
      DEFAULT_ORDER.every((id) => (parsed as string[]).includes(id))
    ) {
      return parsed as SectionId[];
    }
  } catch {
    // ignore
  }
  return DEFAULT_ORDER;
}

function saveOrder(userId: string, order: SectionId[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(order));
  } catch {
    // ignore quota errors
  }
}

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableSection({
  id,
  children,
}: {
  id: SectionId;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : "auto",
      }}
      className={isDragging ? "ring-2 ring-indigo-200 rounded-xl" : ""}
    >
      {/* Drag handle — rendered into each card header via context */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 z-10 flex h-full w-8 cursor-grab items-center justify-center rounded-l-xl text-gray-300 hover:text-gray-500 active:cursor-grabbing touch-none select-none"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  label,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Icon className="h-8 w-8 text-gray-300 mb-2" />
      <p className="text-sm text-gray-400">{label}</p>
      <Link href={action.href} className="mt-2 text-xs text-indigo-600 hover:underline">
        {action.label} →
      </Link>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientSections({
  userId,
  clientId,
  firstName,
  lastName,
  email,
  phone,
  dateOfBirth,
  address,
  city,
  state,
  zip,
  emergencyName,
  emergencyPhone,
  tags = [],
  internalNotes,
  soapNotes,
  appointments,
  invoices,
  orgSlug,
  documents,
}: ClientSectionsProps) {
  const [order, setOrder] = useState<SectionId[]>(DEFAULT_ORDER);
  const dndId = useId();

  // Load saved order from localStorage after mount (client-only)
  useEffect(() => {
    setOrder(loadOrder(userId));
  }, [userId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // prevents accidental drags on tap
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 }, // hold 200ms before drag starts
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as SectionId);
    const newIndex = order.indexOf(over.id as SectionId);
    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    saveOrder(userId, newOrder);
  }

  const sections: Record<SectionId, React.ReactNode> = {
    contact: (
      <ClientContactCard
        firstName={firstName}
        lastName={lastName}
        email={email}
        phone={phone}
        dateOfBirth={dateOfBirth}
        address={address}
        city={city}
        state={state}
        zip={zip}
        emergencyName={emergencyName}
        emergencyPhone={emergencyPhone}
        tags={tags}
        internalNotes={internalNotes}
      />
    ),

    notes: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>SOAP Notes</CardTitle>
          <Link
            href={`/dashboard/notes?clientId=${clientId}`}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {soapNotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              label="No notes yet"
              action={{ href: `/dashboard/notes/new?clientId=${clientId}`, label: "Start first note" }}
            />
          ) : (
            <div className="space-y-2">
              {soapNotes.map((note) => (
                <Link
                  key={note.id}
                  href={`/dashboard/notes/${note.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(note.sessionDate)}</p>
                    <p className="text-xs text-gray-500">{note.practitioner.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={note.status === "SIGNED" ? "success" : "warning"}>
                      {note.status}
                    </Badge>
                    <span className="text-xs text-gray-400">→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    ),

    appointments: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Appointments</CardTitle>
          <Link
            href={`/dashboard/schedule/new?clientId=${clientId}`}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="h-4 w-4 inline" /> Book
          </Link>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              label="No appointments"
              action={{ href: `/dashboard/schedule/new?clientId=${clientId}`, label: "Book appointment" }}
            />
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(appt.startTime, "MMM d, yyyy · h:mm a")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {appt.service?.name ?? "Session"} · {appt.practitioner?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      appt.status === "COMPLETED"
                        ? "success"
                        : appt.status === "CANCELLED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {appt.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    ),

    documents: (
      <ClientDocuments
        clientId={clientId}
        orgSlug={orgSlug}
        initialDocs={documents}
      />
    ),

    invoices: (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Link
            href={`/dashboard/billing/new?clientId=${clientId}`}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="h-4 w-4 inline" /> Invoice
          </Link>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              label="No invoices"
              action={{ href: `/dashboard/billing/new?clientId=${clientId}`, label: "Create invoice" }}
            />
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/dashboard/billing/${inv.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{inv.number}</p>
                    <p className="text-xs text-gray-500">{formatDate(inv.createdAt, "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(inv.total)}
                    </span>
                    <Badge
                      variant={
                        inv.status === "PAID"
                          ? "success"
                          : inv.status === "OVERDUE"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    ),
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {order.map((id) => (
            <SortableSection key={id} id={id}>
              {sections[id]}
            </SortableSection>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
