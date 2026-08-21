import PublicBookingForm from "@/components/booking/public-booking-form";
import { AppFooter } from "@/components/layout/app-footer";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  description: string | null;
}

interface Org {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

/** Shared layout for the public booking page, used by both /book?org= and /book/[slug]. */
export function BookingPageShell({ org, services }: { org: Org; services: Service[] }) {
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
          orgName={org.name}
          services={services}
          primaryColor={org.primaryColor}
        />
      </div>
      <AppFooter />
    </div>
  );
}
