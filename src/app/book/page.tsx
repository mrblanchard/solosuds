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
      select: { id: true, name: true, timezone: true },
    }),
    db.service.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, price: true, description: true },
    }),
  ]);

  if (!org) notFound();

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Book with {org.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a service and your preferred time below.
          </p>
        </div>
        <PublicBookingForm orgId={org.id} services={services} timezone={org.timezone ?? "America/New_York"} />
      </div>
      <AppFooter />
    </div>
  );
}
