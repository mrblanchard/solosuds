import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TableSearch from "@/components/ui/table-search";
import SortHeader from "@/components/ui/sort-header";
import { Users, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import ClientRowActions from "@/components/clients/client-row-actions";
import { Prisma } from "@prisma/client";

const SORT_MAP: Record<string, Prisma.ClientOrderByWithRelationInput | Prisma.ClientOrderByWithRelationInput[]> = {
  name_asc:  [{ lastName: "asc" },  { firstName: "asc" }],
  name_desc: [{ lastName: "desc" }, { firstName: "desc" }],
  date_asc:  { createdAt: "asc" },
  date_desc: { createdAt: "desc" },
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const params = await searchParams;

  const orderBy = SORT_MAP[params.sort ?? ""] ?? [{ lastName: "asc" }, { firstName: "asc" }];

  const clients = await db.client.findMany({
    where: {
      organizationId: orgId,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" } },
              { lastName: { contains: params.q, mode: "insensitive" } },
              { email: { contains: params.q, mode: "insensitive" } },
              { phone: { contains: params.q } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { soapNotes: true, appointments: true } },
    },
    orderBy,
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">{clients.length} clients</p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <TableSearch placeholder="Search by name, email, or phone…" className="flex-1" />
        <div className="flex gap-1">
          {["", "ACTIVE", "INACTIVE", "ARCHIVED"].map((s) => {
            const base = new URLSearchParams();
            if (s) base.set("status", s);
            if (params.q) base.set("q", params.q);
            if (params.sort) base.set("sort", params.sort);
            return (
              <Link
                key={s}
                href={`/dashboard/clients${base.toString() ? `?${base.toString()}` : ""}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (params.status ?? "") === s
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s || "All"}
              </Link>
            );
          })}
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Users className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No clients found</h3>
          <p className="mt-1 text-sm text-gray-500">Add your first client to get started.</p>
          <Link href="/dashboard/clients/new" className="mt-4">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Client
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader field="name" label="Client" />
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
                <SortHeader field="date" label="Added" />
                <th className="relative px-2 xl:px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
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
      )}
    </div>
  );
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
