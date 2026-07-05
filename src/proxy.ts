import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/intake",
  "/book",
  "/manage",
  "/portal",
  "/pay",
  "/terms",
  "/hipaa",
  "/api/auth",
  "/api/webhooks",
  "/api/twilio",
  "/api/Twilio", // Twilio's console has this saved with a capital T and can't be edited there
  "/api/book",
  "/api/manage",
  "/api/intake-forms",
  "/api/portal",
  "/api/pay",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /dev and /api/dev require login (checked here) and are further
  // restricted to a single admin account at the page/route level.
  const isPublic = PUBLIC_PATHS.some(
    (path) =>
      pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) return NextResponse.next();

  // Check for NextAuth session token (edge-compatible, no Prisma needed)
  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|icon\\.svg|logo\\.svg|.*\\.png$|.*\\.jpg$|.*\\.webp$|.*\\.svg$).*)",
  ],
};
