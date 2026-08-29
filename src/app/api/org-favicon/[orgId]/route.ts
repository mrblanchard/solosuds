import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFileBody } from "@/lib/storage";

// Public route — no auth required (favicons are public branding assets)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true },
  });
  if (!org) {
    return new NextResponse(null, { status: 404 });
  }

  const file = await getFileBody(`org-branding/${orgId}/favicon`);
  if (!file) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(file.body as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
