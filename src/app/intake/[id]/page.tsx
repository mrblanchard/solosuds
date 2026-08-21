import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { IntakePageShell } from "@/components/intake/intake-page-shell";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clientId?: string }>;
}

// Kept alongside /intake/[orgSlug]/[formId] for backward compatibility —
// this exact URL shape is already handed out in past emails/texts/consent
// links. Don't remove.
export default async function PublicIntakePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { clientId } = await searchParams;
  const form = await db.intakeForm.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });

  if (!form || !form.isActive) notFound();

  return <IntakePageShell form={form} orgName={form.organization.name} clientId={clientId} />;
}
