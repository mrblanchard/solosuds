import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppFooter } from "@/components/layout/app-footer";
import PortalAccessForm from "@/components/portal/portal-access-form";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

export default async function PortalEntryPage({ params }: Props) {
  const { orgSlug } = await params;

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { name: true, logoUrl: true },
  });

  if (!org) notFound();

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          {org.logoUrl && (
            <img src={org.logoUrl} alt={org.name} className="mx-auto h-12 mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Client Document Portal</p>
        </div>
        <PortalAccessForm orgSlug={orgSlug} orgName={org.name} />
      </div>
      <AppFooter />
    </div>
  );
}
