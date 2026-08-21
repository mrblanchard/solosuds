import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sendWaitlistOpening } from "@/lib/email";
import { sendSms, buildWaitlistOpeningSms } from "@/lib/twilio";
import { zonedTimeToUtc, getZonedHourFraction, getZonedDayOfWeek, getZonedDayBounds, getZonedDateString, formatZonedHHmm } from "@/lib/timezone";

const ACTIVE_STATUSES = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED"] as const;

/**
 * Returns the appointment's publicToken, generating and persisting one first
 * if it doesn't have one yet. The reminder sweep and a manual "send reminder"
 * click can both race to backfill a token for the same appointment; this
 * claims it with a conditional update (only writes if still null) and always
 * reads back whatever actually ended up persisted, so both callers embed the
 * same token in their emails instead of each minting and emailing a different
 * UUID (which would leave one recipient's link 404ing permanently).
 */
export async function ensurePublicToken(appointmentId: string, currentToken: string | null): Promise<string> {
  if (currentToken) return currentToken;
  await db.appointment.updateMany({
    where: { id: appointmentId, publicToken: null },
    data: { publicToken: randomUUID() },
  });
  const fresh = await db.appointment.findUnique({ where: { id: appointmentId }, select: { publicToken: true } });
  return fresh!.publicToken!;
}

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

/**
 * Authoritative server-side check that a requested start time is actually
 * bookable: on a day the org is open, within business hours, and under the
 * daily appointment cap. getAvailableSlots (below) computes the same rules
 * for *display*, but a client can always call the write endpoints directly,
 * so every public write path (new booking, client self-reschedule) must also
 * call this before creating/moving an appointment. Internal dashboard bookings
 * intentionally skip this — a practitioner can book outside their own public
 * hours or over the cap for their own schedule.
 */
export async function validateBookingWindow({
  organizationId,
  startTime,
  excludeAppointmentId,
}: {
  organizationId: string;
  startTime: Date;
  excludeAppointmentId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { bookingStartHour: true, bookingEndHour: true, bookingDays: true, maxDailyAppointments: true, timezone: true },
  });
  if (!org) return { ok: false, error: "Organization not found" };

  // "Business hours" only mean something in the org's own timezone — reading
  // wall-clock day/hour off `startTime` directly would use the server
  // process's timezone (UTC on Vercel) instead, which is exactly what let a
  // client pick an in-hours slot the server then rejected (or vice versa).
  const dayOfWeek = getZonedDayOfWeek(startTime, org.timezone);
  if (!org.bookingDays.includes(dayOfWeek)) {
    return { ok: false, error: "That day isn't available for booking." };
  }

  const hour = getZonedHourFraction(startTime, org.timezone);
  if (hour < org.bookingStartHour || hour >= org.bookingEndHour) {
    return { ok: false, error: "That time is outside business hours." };
  }

  if (org.maxDailyAppointments != null) {
    const [dayStart, dayEnd] = getZonedDayBounds(getZonedDateString(startTime, org.timezone), org.timezone);

    const count = await db.appointment.count({
      where: {
        organizationId,
        status: { in: [...ACTIVE_STATUSES] },
        startTime: { gte: dayStart, lte: dayEnd },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
    });
    if (count >= org.maxDailyAppointments) {
      return { ok: false, error: "That day is fully booked." };
    }
  }

  return { ok: true };
}

interface AvailabilityParams {
  organizationId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
}

export interface SlotInfo {
  time: string; // "HH:mm", wall-clock in the organization's own timezone (org.timezone)
  available: boolean; // false = already booked, or already past — show it, but disabled/grayed
}

interface AvailabilityResult {
  slots: SlotInfo[]; // every slot in the business-hours window, not just the open ones — so the UI can show the full picture and gray out what's taken
  fullyBooked: boolean; // true if none of `slots` are available, for any reason
  reason?: "closed" | "capped" | "unavailable"; // why fullyBooked is true, so the UI can decide whether a waitlist even makes sense
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
        timezone: true,
      },
    }),
    db.service.findFirst({
      where: { id: serviceId, organizationId, isActive: true },
      select: { durationMinutes: true },
    }),
  ]);

  if (!org || !service) return { slots: [], fullyBooked: true, reason: "unavailable" };

  // "date" is a bare calendar day (no timezone attached), so its day-of-week
  // is unambiguous — but the actual bookable window (dayStart/dayEnd, and
  // every slot boundary below) has to be anchored in the org's own timezone,
  // not the server process's, or a slot the client sees as in-hours can get
  // rejected as "outside business hours" once submitted.
  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const [dayStart, dayEnd] = getZonedDayBounds(date, org.timezone);

  if (!org.bookingDays.includes(dayOfWeek)) return { slots: [], fullyBooked: true, reason: "closed" };

  const dayAppointments = await db.appointment.findMany({
    where: {
      organizationId,
      status: { in: [...ACTIVE_STATUSES] },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  if (org.maxDailyAppointments != null && dayAppointments.length >= org.maxDailyAppointments) {
    return { slots: [], fullyBooked: true, reason: "capped" };
  }

  const durationMs = service.durationMinutes * 60000;
  const slotMs = org.bookingSlotMinutes * 60000;
  const now = new Date();

  const slots: SlotInfo[] = [];
  let cursor = zonedTimeToUtc(date, org.bookingStartHour, 0, org.timezone);
  const windowEnd = zonedTimeToUtc(date, org.bookingEndHour, 0, org.timezone);

  while (cursor.getTime() + durationMs <= windowEnd.getTime()) {
    const slotStart = cursor;
    const slotEnd = new Date(slotStart.getTime() + durationMs);

    const isPast = slotStart.getTime() < now.getTime();
    // Keep this predicate in sync with hasConflict's overlap check above — it's
    // re-expressed in-memory here (rather than calling hasConflict per candidate
    // slot) so a day's worth of slots costs one appointment query, not one per slot.
    const overlaps = dayAppointments.some(
      (a) => a.startTime.getTime() < slotEnd.getTime() && a.endTime.getTime() > slotStart.getTime()
    );

    slots.push({ time: formatZonedHHmm(slotStart, org.timezone), available: !isPast && !overlaps });

    cursor = new Date(cursor.getTime() + slotMs);
  }

  const anyAvailable = slots.some((s) => s.available);
  return { slots, fullyBooked: !anyAvailable, reason: anyAvailable ? undefined : "unavailable" };
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

  // Prisma drops `undefined`-valued keys from a where clause entirely, so
  // `{ serviceId: serviceId ?? undefined }` would silently match ALL services
  // when serviceId is null — build the OR arm explicitly instead.
  const serviceMatch = serviceId ? [{ serviceId: null }, { serviceId }] : [{ serviceId: null }];

  const [org, entries] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true, brandFont: true, emailSignature: true, replyToEmail: true },
    }),
    db.waitlistEntry.findMany({
      where: {
        organizationId,
        status: "WAITING",
        AND: [
          { OR: serviceMatch },
          { OR: [{ preferredDate: null }, { preferredDate: { gte: dayStart, lte: dayEnd } }] },
        ],
      },
    }),
  ]);

  if (!org || entries.length === 0) return 0;

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://solosuds.com";
  const bookingUrl = `${baseUrl}/book/${org.slug}`;

  await Promise.allSettled(
    entries.map(async (entry) => {
      await sendWaitlistOpening({
        to: entry.clientEmail,
        clientName: `${entry.clientFirstName} ${entry.clientLastName}`,
        bookingUrl,
        branding: org,
      }).catch((err) => {
        console.error(`[waitlist] Failed to notify ${entry.clientEmail}:`, err);
      });

      if (entry.clientPhone && entry.smsConsentedAt) {
        await sendSms({
          to: entry.clientPhone,
          body: buildWaitlistOpeningSms({ orgName: org.name, openingDate, bookingUrl }),
        }).catch((err) => {
          console.error(`[waitlist] Failed to send SMS to ${entry.clientPhone}:`, err);
        });
      }
    })
  );

  await db.waitlistEntry.updateMany({
    where: { id: { in: entries.map((e) => e.id) } },
    data: { status: "NOTIFIED", notifiedAt: new Date() },
  });

  return entries.length;
}
