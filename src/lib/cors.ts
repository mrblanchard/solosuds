import { NextRequest, NextResponse } from "next/server";

/**
 * Shared CORS helper for the public booking API (org lookup, availability,
 * book, waitlist). These routes take no auth/session and return no secrets,
 * so a wide-open origin is safe — it's what lets the embeddable booking
 * widget (public/embed.js, built from src/embed/) call this API from any
 * customer's own website.
 */
export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/**
 * Wraps a route handler so every response it returns (any branch, any early
 * return) gets the CORS headers attached, without having to touch each
 * individual `NextResponse.json(...)` call site.
 */
export function withCorsRoute(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const response = await handler(request);
    const headers = corsHeaders();
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  };
}

/** Standard OPTIONS preflight handler — export as `export const OPTIONS = corsPreflight;` */
export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
