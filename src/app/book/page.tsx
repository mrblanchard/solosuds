import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PublicBookingForm from "@/components/booking/public-booking-form";
import { AppFooter } from "@/components/layout/app-footer";

interface Props {
  searchParams: Promise<{ org?: string }>;
}

export default async function BookingPage({ searchParams }: Props) {
  const { org: orgId } = await searchParams;
  if (!orgId) notFound();

  const [org, services] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, timezone: true, logoUrl: true, primaryColor: true },
    }),
    db.service.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, price: true, description: true },
    }),
  ]);

  if (!org) notFound();

  const accent = org.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(org.primaryColor)
    ? org.primaryColor
    : undefined;

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          {org.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt={org.name} className="mx-auto mb-4 h-14 w-auto object-contain" />
          )}
          <h1 className="text-2xl font-bold" style={{ color: accent ?? "#111827" }}>
            Book with {org.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a service and your preferred time below.
          </p>
        </div>
        <PublicBookingForm
          orgId={org.id}
          services={services}
          timezone={org.timezone ?? "America/New_York"}
          primaryColor={org.primaryColor}
        />
      </div>
      <AppFooter />
    </div>
  );
}
