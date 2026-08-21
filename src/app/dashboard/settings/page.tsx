import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfileSettings from "@/components/settings/profile-settings";
import OrgSettings from "@/components/settings/org-settings";
import ServicesSettings from "@/components/settings/services-settings";
import ThemePicker from "@/components/settings/theme-picker";
import BookingSettings from "@/components/settings/booking-settings";
import PaymentsSettings from "@/components/settings/payments-settings";
import DiscountCodesSettings from "@/components/settings/discount-codes-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) redirect("/dashboard");

  const [user, org, services, intakeForms, discountCodes] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, role: true, smsForwardNumber: true, theme: true },
    }),
    db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true, name: true, slug: true, phone: true, email: true, address: true, website: true, timezone: true, practiceType: true, noteType: true, defaultIntakeFormId: true, inviteCode: true, plan: true,
        stripeConnectAccountId: true, stripeConnectChargesEnabled: true, stripeConnectDetailsSubmitted: true, stripeConnectPayoutsEnabled: true,
        venmoHandle: true, cashAppHandle: true, paypalHandle: true, squareHandle: true, zelleHandle: true,
        bookingStartHour: true, bookingEndHour: true, bookingDays: true, bookingSlotMinutes: true, maxDailyAppointments: true,
      },
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
    db.discountCode.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: "desc" },
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
          <OrgSettings org={org} intakeForms={intakeForms} plan={org.plan ?? "solo"} />
          <PaymentsSettings org={org} />
          <BookingSettings
            orgSlug={org.slug}
            bookingStartHour={org.bookingStartHour}
            bookingEndHour={org.bookingEndHour}
            bookingDays={org.bookingDays}
            bookingSlotMinutes={org.bookingSlotMinutes}
            maxDailyAppointments={org.maxDailyAppointments}
          />
          <ServicesSettings initialServices={services} />
          <DiscountCodesSettings
            initialCodes={discountCodes.map((c) => ({
              ...c,
              expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
            }))}
          />
        </>
      )}
    </div>
  );
}
