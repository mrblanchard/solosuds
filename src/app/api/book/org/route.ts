import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withCorsRoute, corsPreflight } from "@/lib/cors";

// Public, unauthenticated lookup used to bootstrap the embeddable booking
// widget (public/embed.js) on a customer's own website — it has no
// server-side props to work with, so it fetches the org + services itself.
// Mirrors the query in src/app/book/[slug]/page.tsx.
export const GET = withCorsRoute(async (request: NextRequest) => {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { slug },
    select: { id: true, name: true, logoUrl: true, primaryColor: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const services = await db.service.findMany({
    where: { organizationId: org.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, durationMinutes: true, price: true, description: true },
  });

  return NextResponse.json({ ...org, services });
});

export const OPTIONS = corsPreflight;
