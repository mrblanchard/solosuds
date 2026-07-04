import { db } from "@/lib/db";

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
