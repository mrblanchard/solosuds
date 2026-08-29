import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { IntakePageShell } from "@/components/intake/intake-page-shell";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ clientId?: string }>;
}

// Kept alongside /intake/[slug]/[formId] for backward compatibility — this
// exact URL shape is already handed out in past emails/texts/consent links.
// Don't remove.
//
// Folder is named [slug] (not [id]) purely so it shares a param name with
// the sibling [slug]/[formId] route below it — Next.js doesn't allow two
// same-position dynamic segments with different names ('id' vs 'orgSlug').
// The value itself is still a raw intake form id, same as always.
export default async function PublicIntakePage({ params, searchParams }: Props) {
  const { slug: id } = await params;
  const { clientId } = await searchParams;
  const form = await db.intakeForm.findUnique({
    where: { id },
    include: { organization: { select: { name: true } } },
  });

  if (!form || !form.isActive) notFound();

  return <IntakePageShell form={form} orgName={form.organization.name} clientId={clientId} />;
}
