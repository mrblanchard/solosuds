import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfileSettings from "@/components/settings/profile-settings";
import OrgSettings from "@/components/settings/org-settings";
import ServicesSettings from "@/components/settings/services-settings";
import ThemePicker from "@/components/settings/theme-picker";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const [user, org, services, intakeForms] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true, smsForwardNumber: true, theme: true },
    }),
    db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, name: true, phone: true, email: true, address: true, website: true, timezone: true, practiceType: true, noteType: true, defaultIntakeFormId: true },
    }),
    db.service.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: { id: true, name: true, description: true, durationMinutes: true, price: true, color: true, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.intakeForm.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!user || !org) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and organization preferences.</p>
      </div>

      <ProfileSettings user={user} />
      <ThemePicker currentTheme={user.theme ?? "lavender"} />

      {(user.role === "OWNER" || user.role === "ADMIN") && (
        <>
          <OrgSettings org={org} intakeForms={intakeForms} />
          <ServicesSettings initialServices={services} />
        </>
      )}
    </div>
  );
}
