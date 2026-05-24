import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSignedDownloadUrl, deleteFile } from "@/lib/storage";

// GET — get signed download URL (practitioner)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId, docId } = await params;

  const doc = await db.document.findFirst({
    where: { id: docId, clientId, organizationId: session.user.organizationId },
    select: { storageKey: true, name: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.documentAuditLog.create({
    data: {
      documentId: docId,
      action: "downloaded",
      actor: session.user.id,
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    },
  });

  const url = await getSignedDownloadUrl(doc.storageKey, 900);
  return NextResponse.json({ url, name: doc.name });
}

// DELETE — practitioner deletes a document
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId, docId } = await params;

  const doc = await db.document.findFirst({
    where: { id: docId, clientId, organizationId: session.user.organizationId },
    select: { id: true, storageKey: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteFile(doc.storageKey);
  await db.document.delete({ where: { id: docId } });

  return NextResponse.json({ ok: true });
}
