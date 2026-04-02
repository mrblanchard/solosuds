import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SoapNoteEditor } from "@/components/notes/soap-note-editor";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const { id } = await params;

  const note = await db.soapNote.findFirst({
    where: { id, organizationId: orgId },
    include: {
      client: true,
      practitioner: { select: { name: true } },
      template: true,
    },
  });

  if (!note) notFound();

  const statusMap: Record<string, { variant: "default" | "success" | "warning" | "secondary" | "destructive"; label: string }> = {
    DRAFT: { variant: "warning", label: "Draft" },
    SIGNED: { variant: "success", label: "Signed" },
    LOCKED: { variant: "secondary", label: "Locked" },
    AMENDED: { variant: "default", label: "Amended" },
  };
  const statusConfig = statusMap[note.status] ?? { variant: "secondary" as const, label: note.status };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/notes"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Notes
          </Link>
          <span className="text-gray-300">/</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {note.client.firstName} {note.client.lastName}
              </h1>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Session: {formatDate(note.sessionDate)} · {note.practitioner.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/notes/new?duplicateFrom=${note.id}`}>
            <Button variant="outline" size="sm">
              Duplicate Note
            </Button>
          </Link>
          {note.appointmentId && (
            <Link href={`/dashboard/billing/new?appointmentId=${note.appointmentId}`}>
              <Button variant="outline" size="sm">
                Create Invoice
              </Button>
            </Link>
          )}
        </div>
      </div>

      <SoapNoteEditor
        noteId={note.id}
        clientName={`${note.client.firstName} ${note.client.lastName}`}
        initialData={{
          subjective: note.subjective ?? "",
          objective: note.objective ?? "",
          assessment: note.assessment ?? "",
          plan: note.plan ?? "",
          diagnosisCodes: note.diagnosisCodes.join(", "),
          procedureCodes: note.procedureCodes.join(", "),
          status: note.status,
          transcript: note.transcript ?? "",
        }}
      />
    </div>
  );
}
