import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import IntakeFormEditor from "@/components/intake/intake-form-editor";
import CopyLinkButton from "@/components/intake/copy-link-button";
import SendFormButtons from "@/components/intake/send-form-buttons";
import DeleteFormButton from "@/components/intake/delete-form-button";

export default async function IntakeFormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) notFound();

  const [form, clients] = await Promise.all([
    db.intakeForm.findFirst({
      where: { id, organizationId: session.user.organizationId },
      include: { _count: { select: { submissions: true } } },
    }),
    db.client.findMany({
      where: { organizationId: session.user.organizationId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  if (!form) notFound();

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/intake/${form.id}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/intake"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Intake Forms
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
        </div>
        <DeleteFormButton formId={form.id} formTitle={form.title} variant="button" />
      </div>

      {/* Shareable link banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-indigo-700 mb-0.5">
            Client link · {form._count.submissions} submission{form._count.submissions !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-indigo-900 truncate font-mono">{publicUrl}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
          <CopyLinkButton url={publicUrl} />
          <SendFormButtons formId={form.id} clients={clients} />
        </div>
      </div>

      <IntakeFormEditor
        form={{
          id: form.id,
          title: form.title,
          description: form.description ?? "",
          fields: form.fields as any[],
          isActive: form.isActive,
        }}
      />
    </div>
  );
}
