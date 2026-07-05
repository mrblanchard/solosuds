import { db } from "@/lib/db";
import { sendWaitlistOpening } from "@/lib/email";

const ACTIVE_STATUSES = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as const;

/**
 * Returns true if the given time range overlaps an existing active appointment
 * for the organization (and practitioner, if provided). Cancelled and no-show
 * appointments don't block the slot.
 */
export async function hasConflict({
  organizationId,
  practitionerId,
  startTime,
  endTime,
  excludeAppointmentId,
}: {
  organizationId: string;
  practitionerId?: string | null;
  startTime: Date;
  endTime: Date;
  excludeAppointmentId?: string;
}): Promise<boolean> {
  const conflict = await db.appointment.findFirst({
    where: {
      organizationId,
      ...(practitionerId ? { practitionerId } : {}),
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      status: { in: [...ACTIVE_STATUSES] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });

  return !!conflict;
}

interface AvailabilityParams {
  organizationId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
}

interface AvailabilityResult {
  slots: string[]; // "HH:mm" start times, in the server's local time (matches how dates are combined elsewhere in booking)
  fullyBooked: boolean; // true if the day hit the org's max-daily-appointments cap
}

/** Computes open start-time slots for a given day, respecting org hours/days, service duration, existing bookings, and the daily cap. */
export async function getAvailableSlots({ organizationId, serviceId, date }: AvailabilityParams): Promise<AvailabilityResult> {
  const [org, service] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: {
        bookingStartHour: true,
        bookingEndHour: true,
        bookingDays: true,
        bookingSlotMinutes: true,
        maxDailyAppointments: true,
      },
    }),
    db.service.findUnique({ where: { id: serviceId }, select: { durationMinutes: true } }),
  ]);

  if (!org || !service) return { slots: [], fullyBooked: false };

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59.999`);
  const dayOfWeek = dayStart.getDay();

  if (!org.bookingDays.includes(dayOfWeek)) return { slots: [], fullyBooked: false };

  const dayAppointments = await db.appointment.findMany({
    where: {
      organizationId,
      status: { in: [...ACTIVE_STATUSES] },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  if (org.maxDailyAppointments != null && dayAppointments.length >= org.maxDailyAppointments) {
    return { slots: [], fullyBooked: true };
  }

  const durationMs = service.durationMinutes * 60000;
  const slotMs = org.bookingSlotMinutes * 60000;
  const now = new Date();

  const slots: string[] = [];
  let cursor = new Date(`${date}T00:00:00`);
  cursor.setHours(org.bookingStartHour, 0, 0, 0);
  const windowEnd = new Date(`${date}T00:00:00`);
  windowEnd.setHours(org.bookingEndHour, 0, 0, 0);

  while (cursor.getTime() + durationMs <= windowEnd.getTime()) {
    const slotStart = cursor;
    const slotEnd = new Date(slotStart.getTime() + durationMs);

    const isPast = slotStart.getTime() < now.getTime();
    const overlaps = dayAppointments.some(
      (a) => a.startTime.getTime() < slotEnd.getTime() && a.endTime.getTime() > slotStart.getTime()
    );

    if (!isPast && !overlaps) {
      const hh = String(slotStart.getHours()).padStart(2, "0");
      const mm = String(slotStart.getMinutes()).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }

    cursor = new Date(cursor.getTime() + slotMs);
  }

  return { slots, fullyBooked: slots.length === 0 };
}

/**
 * Notifies waiting clients that a slot opened up, e.g. after a cancellation.
 * Matches on service (or "any service" entries) and, if the entry specified a
 * preferred date, only notifies for openings on that same day. Marks matched
 * entries NOTIFIED so they aren't re-notified for the same opening.
 */
export async function notifyWaitlistForOpening({
  organizationId,
  serviceId,
  openingDate,
}: {
  organizationId: string;
  serviceId?: string | null;
  openingDate: Date;
}): Promise<number> {
  const dayStart = new Date(openingDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(openingDate);
  dayEnd.setHours(23, 59, 59, 999);

  const [org, entries] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true },
    }),
    db.waitlistEntry.findMany({
      where: {
        organizationId,
        status: "WAITING",
        OR: [{ serviceId: null }, { serviceId: serviceId ?? undefined }],
        AND: [
          {
            OR: [
              { preferredDate: null },
              { preferredDate: { gte: dayStart, lte: dayEnd } },
            ],
          },
        ],
      },
    }),
  ]);

  if (!org || entries.length === 0) return 0;

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
  const bookingUrl = `${baseUrl}/book?org=${org.id}`;

  for (const entry of entries) {
    try {
      await sendWaitlistOpening({
        to: entry.clientEmail,
        clientName: `${entry.clientFirstName} ${entry.clientLastName}`,
        bookingUrl,
        branding: org,
      });
    } catch (err) {
      console.error(`[waitlist] Failed to notify ${entry.clientEmail}:`, err);
    }
  }

  await db.waitlistEntry.updateMany({
    where: { id: { in: entries.map((e) => e.id) } },
    data: { status: "NOTIFIED", notifiedAt: new Date() },
  });

  return entries.length;
}
