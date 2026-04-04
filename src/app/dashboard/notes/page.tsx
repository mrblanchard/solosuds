import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TableSearch from "@/components/ui/table-search";
import SortHeader from "@/components/ui/sort-header";
import { FileText, Plus, LayoutTemplate } from "lucide-react";
import { Prisma } from "@prisma/client";

const SORT_MAP: Record<string, Prisma.SoapNoteOrderByWithRelationInput | Prisma.SoapNoteOrderByWithRelationInput[]> = {
  client_asc:  [{ client: { lastName: "asc" } },  { client: { firstName: "asc" } }],
  client_desc: [{ client: { lastName: "desc" } }, { client: { firstName: "desc" } }],
  date_asc:    { sessionDate: "asc" },
  date_desc:   { sessionDate: "desc" },
  status_asc:  { status: "asc" },
  status_desc: { status: "desc" },
};

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; clientId?: string; q?: string; sort?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const params = await searchParams;

  const orderBy = SORT_MAP[params.sort ?? ""] ?? { sessionDate: "desc" };

  const notes = await db.soapNote.findMany({
    where: {
      organizationId: orgId,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.clientId ? { clientId: params.clientId } : {}),
      ...(params.q
        ? {
            OR: [
              { client: { firstName: { contains: params.q, mode: "insensitive" } } },
              { client: { lastName:  { contains: params.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      practitioner: { select: { name: true } },
    },
    orderBy,
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="mt-1 text-sm text-gray-500">{notes.length} notes found</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/notes/templates">
            <Button variant="outline">
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </Link>
          <Link href="/dashboard/notes/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <TableSearch placeholder="Search by client name…" className="max-w-sm" />

      {/* Status filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { label: "All", value: "" },
          { label: "Drafts", value: "DRAFT" },
          { label: "Signed", value: "SIGNED" },
          { label: "Locked", value: "LOCKED" },
        ].map((tab) => {
          const base = new URLSearchParams();
          if (tab.value) base.set("status", tab.value);
          if (params.q) base.set("q", params.q);
          if (params.sort) base.set("sort", params.sort);
          return (
            <Link
              key={tab.value}
              href={`/dashboard/notes${base.toString() ? `?${base.toString()}` : ""}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                (params.status ?? "") === tab.value
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No notes yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start by creating a new SOAP note after a session.
          </p>
          <Link href="/dashboard/notes/new" className="mt-4">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Note
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader field="client" label="Client" />
                <SortHeader field="date" label="Session Date" />
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Practitioner
                </th>
                <SortHeader field="status" label="Status" />
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Last Updated
                </th>
                <th className="relative px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {notes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/clients/${note.clientId}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {note.client.firstName} {note.client.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(note.sessionDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {note.practitioner.name}
                  </td>
                  <td className="px-6 py-4">
                    <NoteStatusBadge status={note.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDate(note.updatedAt, "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/notes/${note.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {note.status === "DRAFT" ? "Continue →" : "View →"}
                    </Link>
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

function NoteStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "default" | "success" | "warning" | "secondary" | "destructive"; label: string }> = {
    DRAFT: { variant: "warning", label: "Draft" },
    SIGNED: { variant: "success", label: "Signed" },
    LOCKED: { variant: "secondary", label: "Locked" },
    AMENDED: { variant: "default", label: "Amended" },
  };
  const config = map[status] ?? { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
