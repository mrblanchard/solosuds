import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PublicIntakeForm from "@/components/intake/public-intake-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicIntakePage({ params }: Props) {
  const { id } = await params;
  const form = await db.intakeForm.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });

  if (!form || !form.isActive) notFound();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-500">{form.organization.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-sm text-gray-600">{form.description}</p>
          )}
        </div>
        <PublicIntakeForm formId={form.id} fields={form.fields as any[]} />
      </div>
    </div>
  );
}
