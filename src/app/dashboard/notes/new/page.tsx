import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewNoteForm from "@/components/notes/new-note-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    appointmentId?: string;
    duplicateFrom?: string;
  }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId!;
  const params = await searchParams;

  const [clients, templates] = await Promise.all([
    db.client.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.noteTemplate.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/notes"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Notes
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          {params.duplicateFrom ? "Duplicate Note" : "New Note"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewNoteForm
            clients={clients}
            templates={templates}
            defaultClientId={params.clientId}
            defaultAppointmentId={params.appointmentId}
            duplicateFromId={params.duplicateFrom}
          />
        </CardContent>
      </Card>
    </div>
  );
}
