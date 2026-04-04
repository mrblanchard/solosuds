import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import NoteTemplateList from "@/components/notes/note-template-list";

export default async function NoteTemplatesPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const templates = await db.noteTemplate.findMany({
    where: { organizationId: session.user.organizationId },
    include: { _count: { select: { soapNotes: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/notes"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Notes
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">Note Templates</h1>
      </div>

      <p className="text-sm text-gray-500">
        Templates pre-fill your notes with prompts, session types, and default billing codes so you
        don&apos;t start from scratch every time.
      </p>

      <NoteTemplateList
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          sessionType: t.sessionType,
          isDefault: t.isDefault,
          _count: t._count,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
