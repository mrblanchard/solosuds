import crypto from "crypto";
import { db } from "@/lib/db";

/**
 * Password reset tokens, stored in the Auth.js VerificationToken table (unused
 * otherwise, since the app has no magic-link sign-in) so no migration is
 * needed. Only a SHA-256 hash of the token is stored; the raw token exists
 * only in the emailed link. Tokens are single use and expire after an hour.
 */

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const IDENTIFIER_PREFIX = "password-reset:";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Creates a reset token for this user ID, replacing any earlier one. Returns the raw token. */
export async function createResetToken(userId: string): Promise<string> {
  const identifier = IDENTIFIER_PREFIX + userId;
  const raw = crypto.randomBytes(32).toString("base64url");
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier } }),
    db.verificationToken.create({
      data: { identifier, token: hashToken(raw), expires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    }),
  ]);
  return raw;
}

/**
 * Validates and deletes a reset token. Returns the user ID it was issued for,
 * or null if the token is unknown, expired, or not a reset token.
 */
export async function consumeResetToken(raw: string): Promise<string | null> {
  if (!raw || raw.length > 200) return null;
  const record = await db.verificationToken.findUnique({ where: { token: hashToken(raw) } });
  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) return null;

  // Single use: delete before checking expiry so an expired token is cleaned up too.
  await db.verificationToken.delete({ where: { token: record.token } }).catch(() => {});
  if (record.expires < new Date()) return null;

  return record.identifier.slice(IDENTIFIER_PREFIX.length);
}
