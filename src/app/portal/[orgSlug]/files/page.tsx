import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal-session";
import { AppFooter } from "@/components/layout/app-footer";
import PortalFiles from "@/components/portal/portal-files";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

export default async function PortalFilesPage({ params }: Props) {
  const { orgSlug } = await params;
  const session = await getPortalSession();

  if (!session) {
    redirect(`/portal/${orgSlug}`);
  }

  const [org, client, docs] = await Promise.all([
    db.organization.findUnique({
      where: { slug: orgSlug },
      select: { name: true, logoUrl: true },
    }),
    db.client.findUnique({
      where: { id: session.clientId },
      select: { firstName: true, lastName: true },
    }),
    db.document.findMany({
      where: { clientId: session.clientId, organizationId: session.orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        direction: true,
        createdAt: true,
      },
    }),
  ]);

  if (!org || !client) redirect(`/portal/${orgSlug}`);

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="text-center mb-6">
            {org.logoUrl && (
              <img src={org.logoUrl} alt={org.name} className="mx-auto h-10 mb-3 object-contain" />
            )}
            <h1 className="text-xl font-bold text-gray-900">{org.name}: Client Portal</h1>
            <p className="text-sm text-gray-500 mt-1">
              Signed in as {client.firstName} {client.lastName}
            </p>
          </div>

          {/* HIPAA notice */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-6">
            <strong>Your files are secure.</strong> All documents are encrypted at rest and in
            transit. Download links expire after 15 minutes and are only accessible to you and your
            care team.
          </div>
        </div>

        <PortalFiles orgSlug={orgSlug} initialDocs={docs} />
      </div>
      <AppFooter />
    </div>
  );
}
