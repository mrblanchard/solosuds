import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BookingPageShell } from "@/components/booking/booking-page-shell";

interface Props {
  params: Promise<{ slug: string }>;
}

// The friendly booking link a practitioner gets shown/copies going forward:
// solosuds.com/book/shop-jeremy-store instead of the old solosuds.com/book?org=<cuid>.
export default async function BookingSlugPage({ params }: Props) {
  const { slug } = await params;

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, logoUrl: true, primaryColor: true },
  });
  if (!org) notFound();

  const services = await db.service.findMany({
    where: { organizationId: org.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, durationMinutes: true, price: true, description: true },
  });

  return <BookingPageShell org={org} services={services} />;
}
