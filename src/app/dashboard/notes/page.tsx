import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; clientId?: string; q?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const params = await searchParams;

  const notes = await db.soapNote.findMany({
    where: {
      organizationId: orgId,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.clientId ? { clientId: params.clientId } : {}),
    },
    include: {
      client: true,
      practitioner: { select: { name: true } },
    },
    orderBy: { sessionDate: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOAP Notes</h1>
          <p className="mt-1 text-sm text-gray-500">{notes.length} notes found</p>
        </div>
        <Link href="/dashboard/notes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { label: "All", value: "" },
          { label: "Drafts", value: "DRAFT" },
          { label: "Signed", value: "SIGNED" },
          { label: "Locked", value: "LOCKED" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/notes${tab.value ? `?status=${tab.value}` : ""}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              (params.status ?? "") === tab.value
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Session Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Practitioner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
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
