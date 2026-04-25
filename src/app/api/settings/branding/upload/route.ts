import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/gif"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type"); // "logo" | "favicon"

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (type !== "logo" && type !== "favicon") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Use PNG, JPG, WebP, SVG, ICO, or GIF." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
    }

    const orgId = session.user.organizationId;
    const key = `org-branding/${orgId}/${type}`;
    const arrayBuffer = await file.arrayBuffer();
    await uploadFile({ key, body: Buffer.from(arrayBuffer), contentType: file.type });

    // Store the internal proxy URL in the DB so existing portal/email code just uses the field
    const proxyUrl =
      type === "logo"
        ? `/api/org-logo/${orgId}`
        : `/api/org-favicon/${orgId}`;

    await db.organization.update({
      where: { id: orgId },
      data: type === "logo" ? { logoUrl: proxyUrl } : { faviconUrl: proxyUrl },
    });

    return NextResponse.json({ url: proxyUrl });
  } catch (error) {
    console.error("[POST /api/settings/branding/upload]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
