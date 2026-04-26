import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import BrandingSettings from "@/components/settings/branding-settings";
import EmailWhiteLabelSettings from "@/components/settings/email-whitelabel-settings";

export default async function WhiteLabelPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      name: true,
      logoUrl: true,
      faviconUrl: true,
      primaryColor: true,
      brandFont: true,
      emailSignature: true,
      replyToEmail: true,
    },
  });

  if (!org) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">White Label</h1>
        <p className="mt-1 text-sm text-gray-500">
          Customize how your practice looks and how outgoing emails appear to clients.
        </p>
      </div>

      <BrandingSettings
        org={{
          name: org.name,
          logoUrl: org.logoUrl ?? null,
          faviconUrl: org.faviconUrl ?? null,
          primaryColor: org.primaryColor ?? null,
          brandFont: org.brandFont ?? null,
          emailSignature: org.emailSignature ?? null,
        }}
      />

      <EmailWhiteLabelSettings
        initialReplyToEmail={org.replyToEmail ?? ""}
      />
    </div>
  );
}
