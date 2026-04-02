import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfileSettings from "@/components/settings/profile-settings";
import OrgSettings from "@/components/settings/org-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/login");

  const [user, org] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true },
    }),
    db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, name: true, phone: true, email: true, address: true, website: true, timezone: true },
    }),
  ]);

  if (!user || !org) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and organization preferences.</p>
      </div>

      <ProfileSettings user={user} />

      {(user.role === "OWNER" || user.role === "ADMIN") && (
        <OrgSettings org={org} />
      )}
    </div>
  );
}
