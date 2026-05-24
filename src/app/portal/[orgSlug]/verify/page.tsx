import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppFooter } from "@/components/layout/app-footer";
import PortalVerifyForm from "@/components/portal/portal-verify-form";

interface Props {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ contact?: string }>;
}

export default async function PortalVerifyPage({ params, searchParams }: Props) {
  const { orgSlug } = await params;
  const { contact } = await searchParams;

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { name: true },
  });

  if (!org || !contact) notFound();

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your verification code</p>
        </div>
        <PortalVerifyForm orgSlug={orgSlug} contact={contact} />
      </div>
      <AppFooter />
    </div>
  );
}
