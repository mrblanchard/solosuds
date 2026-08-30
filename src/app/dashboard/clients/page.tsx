import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import TableSearch from "@/components/ui/table-search";
import { Users, Plus, Upload, Download } from "lucide-react";
import ClientTable from "@/components/clients/client-table";
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

  const canExport = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

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
        <div className="flex gap-2">
          {canExport && (
            <a href="/api/export/clients">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </a>
          )}
          <Link href="/dashboard/clients/import">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </Link>
          <Link href="/dashboard/clients/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </Link>
        </div>
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
        <ClientTable
          clients={clients.map((c) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            dateOfBirth: c.dateOfBirth?.toISOString() ?? null,
            status: c.status,
            createdAt: c.createdAt.toISOString(),
            _count: c._count,
          }))}
        />
      )}
    </div>
  );
}
