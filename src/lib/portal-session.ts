import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "portal-session";
const TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecret() {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

// Extends JWTPayload (rather than a bare interface) so it carries jose's
// index signature — SignJWT requires that structurally, even though a plain
// object with just these two fields works identically at runtime.
export interface PortalPayload extends JWTPayload {
  clientId: string;
  orgId: string;
}

export async function signPortalSession(payload: PortalPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyPortalSession(token: string): Promise<PortalPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.clientId === "string" &&
      typeof payload.orgId === "string"
    ) {
      return { clientId: payload.clientId, orgId: payload.orgId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPortalSession(): Promise<PortalPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

export function portalSessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}
