import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(date: Date | string, fmt = "MMMM d, yyyy"): string {
  // Prisma returns date-only fields as UTC midnight Date objects. Formatting them
  // with local timezone shifts the day back by 1 in negative-offset zones.
  // Always use UTC components so the calendar date is preserved regardless of server TZ.
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return format(new Date(year, month - 1, day), fmt);
  }
  const d = new Date(date);
  return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), fmt);
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Shared Validation Schemas ────────────────────────────────────────────────

export const PASSWORD_RULES = "At least 12 characters, one uppercase, one lowercase, one digit, and one special character";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  if (result.success) return null;
  return result.error.issues[0].message;
}

export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s()-]{7,20}$/, "Invalid phone number")
  .or(z.literal(""));

export const nameSchema = z.string().min(1).max(200);
export const longTextSchema = z.string().max(10000);

/** How long an org team-invite code remains valid before it must be regenerated. */
export const INVITE_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Field Formatting / Normalization ─────────────────────────────────────────

/** Format a US phone string as 802-258-0000 or +1-802-258-0000 while the user types. */
export function formatPhone(raw: string): string {
  // Strip everything except digits and leading +
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  // International with country code (11+ digits starting with 1)
  if (hasPlus || digits.length > 10) {
    const cc = digits.slice(0, digits.length - 10);
    const area = digits.slice(-10, -7);
    const mid = digits.slice(-7, -4);
    const last = digits.slice(-4);
    if (digits.length <= 1) return hasPlus ? `+${digits}` : digits;
    if (digits.length <= 4) return `+${cc}-${area}`;
    if (digits.length <= 7) return `+${cc}-${area}-${mid}`;
    return `+${cc}-${area}-${mid}-${last}`;
  }

  // Standard 10-digit US
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Strip a formatted phone to digits-only (with optional leading +). For storage / validation. */
export function stripPhone(formatted: string): string {
  const hasPlus = formatted.startsWith("+");
  const digits = formatted.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/** Auto-capitalize first letter of each word (for names). */
export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Trim and collapse internal whitespace. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Format US ZIP: 12345 or 12345-6789 */
export function formatZip(raw: string): string {
  const digits = raw.replace(/[^A-Za-z0-9]/g, "");
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
}

/** Lowercase and trim an email. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
