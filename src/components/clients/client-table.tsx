"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import ClientRowActions from "@/components/clients/client-row-actions";
import BulkActionsBar from "@/components/clients/bulk-actions-bar";
import SortHeader from "@/components/ui/sort-header";

interface ClientRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  status: string;
  createdAt: string;
  _count: { soapNotes: number; appointments: number };
}

function ClientStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "success" | "secondary" | "destructive"; label: string }> = {
    ACTIVE: { variant: "success", label: "Active" },
    INACTIVE: { variant: "secondary", label: "Inactive" },
    ARCHIVED: { variant: "destructive", label: "Archived" },
  };
  const config = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function formatDate(date: string | Date, fmt: string) {
  const d = new Date(date);
  if (fmt === "MM/dd/yyyy") {
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  }
  // "MMM d, yyyy"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ClientTable({ clients }: { clients: ClientRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = clients.length > 0 && selected.size === clients.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map((c) => c.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <BulkActionsBar
        selectedIds={Array.from(selected)}
        onClear={() => setSelected(new Set())}
      />
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 xl:px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all clients"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <Suspense fallback={<th className="px-2 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Client</th>}>
                  <SortHeader field="name" label="Client" />
                </Suspense>
                <th className="px-2 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Contact
                </th>
                <th className="px-2 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-2 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Notes
                </th>
                <th className="px-2 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Appts
                </th>
                <Suspense fallback={<th className="px-2 xl:px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Added</th>}>
                  <SortHeader field="date" label="Added" />
                </Suspense>
                <th className="relative px-2 xl:px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className={`hover:bg-gray-50 transition-colors ${selected.has(client.id) ? "bg-indigo-50/50" : ""}`}
                >
                  <td className="px-2 xl:px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(client.id)}
                      onChange={() => toggle(client.id)}
                      aria-label={`Select ${client.firstName} ${client.lastName}`}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-2 xl:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {client.firstName[0]}{client.lastName[0]}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {client.firstName} {client.lastName}
                        </Link>
                        {client.dateOfBirth && (
                          <p className="text-xs text-gray-400">
                            DOB: {formatDate(client.dateOfBirth, "MM/dd/yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 xl:px-6 py-4">
                    <div className="text-sm text-gray-600">{client.email}</div>
                    <div className="text-xs text-gray-400">{client.phone}</div>
                  </td>
                  <td className="px-2 xl:px-6 py-4">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="px-2 xl:px-6 py-4 text-sm text-gray-600">
                    {client._count.soapNotes}
                  </td>
                  <td className="px-2 xl:px-6 py-4 text-sm text-gray-600">
                    {client._count.appointments}
                  </td>
                  <td className="px-2 xl:px-6 py-4 text-sm text-gray-400">
                    {formatDate(client.createdAt, "MMM d, yyyy")}
                  </td>
                  <td className="px-2 xl:px-6 py-4 text-right whitespace-nowrap">
                    <ClientRowActions
                      clientId={client.id}
                      clientName={`${client.firstName} ${client.lastName}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
