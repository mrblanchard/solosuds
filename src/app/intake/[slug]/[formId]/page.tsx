import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { IntakePageShell } from "@/components/intake/intake-page-shell";

interface Props {
  params: Promise<{ slug: string; formId: string }>;
  searchParams: Promise<{ clientId?: string }>;
}

// The friendly intake-form link generated going forward:
// solosuds.com/intake/shop-jeremy-store/<formId> instead of the old
// solosuds.com/intake/<formId>. The form is still keyed by its own id (forms
// don't have their own slug), but the org's name is now visible in the URL.
//
// The [slug] param here is the org's slug (folder can't be named [orgSlug] —
// see the comment in ../page.tsx for why it has to match that sibling route's
// param name).
export default async function PublicIntakeSlugPage({ params, searchParams }: Props) {
  const { slug: orgSlug, formId } = await params;
  const { clientId } = await searchParams;

  const org = await db.organization.findUnique({ where: { slug: orgSlug }, select: { id: true, name: true } });
  if (!org) notFound();

  const form = await db.intakeForm.findFirst({
    where: { id: formId, organizationId: org.id },
  });
  if (!form || !form.isActive) notFound();

  return <IntakePageShell form={form} orgName={org.name} clientId={clientId} />;
}
