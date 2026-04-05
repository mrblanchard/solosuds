import { db } from "@/lib/db";

export type Permission = "manage_settings" | "manage_billing" | "manage_schedule" | "manage_clients" | "manage_notes" | "manage_intake" | "manage_email" | "delete";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: ["manage_settings", "manage_billing", "manage_schedule", "manage_clients", "manage_notes", "manage_intake", "manage_email", "delete"],
  ADMIN: ["manage_settings", "manage_billing", "manage_schedule", "manage_clients", "manage_notes", "manage_intake", "manage_email", "delete"],
  PRACTITIONER: ["manage_schedule", "manage_clients", "manage_notes", "manage_intake", "manage_email", "manage_billing"],
  FRONT_DESK: ["manage_clients", "manage_notes", "manage_intake", "manage_email"],
};

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ?? null;
}
