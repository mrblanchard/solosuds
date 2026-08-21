import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BookingPageShell } from "@/components/booking/booking-page-shell";

interface Props {
  searchParams: Promise<{ org?: string }>;
}

// Kept alongside /book/[slug] for backward compatibility — this exact URL
// shape is already handed out in existing links, QR codes, and the approved
// Twilio toll-free verification's opt-in flow URL. Don't remove.
export default async function BookingPage({ searchParams }: Props) {
  const { org: orgId } = await searchParams;
  if (!orgId) notFound();

  const [org, services] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, logoUrl: true, primaryColor: true },
    }),
    db.service.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, price: true, description: true },
    }),
  ]);

  if (!org) notFound();

  return <BookingPageShell org={org} services={services} />;
}
