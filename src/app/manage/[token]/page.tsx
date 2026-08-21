import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatZonedDisplay } from "@/lib/timezone";
import { AppFooter } from "@/components/layout/app-footer";
import ManageBookingClient from "@/components/booking/manage-booking-client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ManageBookingPage({ params }: Props) {
  const { token } = await params;

  const appointment = await db.appointment.findFirst({
    where: { publicToken: token },
    include: {
      client: { select: { firstName: true, lastName: true } },
      service: { select: { id: true, name: true, durationMinutes: true } },
      organization: {
        select: { id: true, name: true, logoUrl: true, primaryColor: true, timezone: true },
      },
    },
  });

  if (!appointment) notFound();

  const accent = appointment.organization.primaryColor && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(appointment.organization.primaryColor)
    ? appointment.organization.primaryColor
    : undefined;

  const zonedDisplay = formatZonedDisplay(appointment.startTime, appointment.organization.timezone);

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          {appointment.organization.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={appointment.organization.logoUrl} alt={appointment.organization.name} className="mx-auto mb-4 h-14 w-auto object-contain" />
          )}
          <h1 className="text-2xl font-bold" style={{ color: accent ?? "#111827" }}>
            Manage Your Appointment
          </h1>
          <p className="mt-1 text-sm text-gray-500">{appointment.organization.name}</p>
        </div>

        <ManageBookingClient
          token={token}
          orgId={appointment.organization.id}
          status={appointment.status}
          serviceId={appointment.service?.id ?? null}
          serviceName={appointment.service?.name ?? "Appointment"}
          durationMinutes={appointment.service?.durationMinutes ?? 60}
          clientName={appointment.client ? `${appointment.client.firstName} ${appointment.client.lastName}` : null}
          formattedDate={zonedDisplay.dateStr}
          formattedTime={zonedDisplay.timeStr}
          accent={accent}
        />
      </div>
      <AppFooter />
    </div>
  );
}
