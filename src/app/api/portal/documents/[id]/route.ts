import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { db } from "@/lib/db";
import { getSignedDownloadUrl, deleteFile } from "@/lib/storage";

// GET — get a signed download URL for a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id, clientId: session.clientId, organizationId: session.orgId },
    select: { storageKey: true, name: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.documentAuditLog.create({
    data: {
      documentId: id,
      action: "downloaded",
      actor: "client",
      ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
    },
  });

  const url = await getSignedDownloadUrl(doc.storageKey, 900); // 15 min
  return NextResponse.json({ url, name: doc.name });
}

// DELETE — client can only delete their own uploads
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await db.document.findFirst({
    where: {
      id,
      clientId: session.clientId,
      organizationId: session.orgId,
      uploadedBy: "client", // clients can only delete their own uploads
    },
    select: { id: true, storageKey: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found or not deletable" }, { status: 404 });

  await deleteFile(doc.storageKey);
  await db.document.delete({ where: { id } }); // cascade deletes audit logs

  return NextResponse.json({ ok: true });
}
