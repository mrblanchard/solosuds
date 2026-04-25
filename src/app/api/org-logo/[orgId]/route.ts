import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFileBody } from "@/lib/storage";

// Public route — no auth required (logos are public branding assets)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  // Verify the org exists
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true },
  });
  if (!org) {
    return new NextResponse(null, { status: 404 });
  }

  const file = await getFileBody(`org-branding/${orgId}/logo`);
  if (!file) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
