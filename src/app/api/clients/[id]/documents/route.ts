import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile, getSignedDownloadUrl, deleteFile } from "@/lib/storage";
import { randomUUID } from "crypto";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// GET — list all documents for a client (practitioner view)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = await params;

  const docs = await db.document.findMany({
    where: { clientId, organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      sizeBytes: true,
      direction: true,
      uploadedBy: true,
      createdAt: true,
    },
  });

  return NextResponse.json(docs);
}

// POST — practitioner shares a document with the client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const orgId = session.user.organizationId;

  // Verify client belongs to this org
  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 413 });
  }

  const ext = file.name.split(".").pop() ?? "";
  const storageKey = `orgs/${orgId}/clients/${clientId}/${randomUUID()}${ext ? `.${ext}` : ""}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadFile({ key: storageKey, body: buffer, contentType: file.type });

  const doc = await db.document.create({
    data: {
      organizationId: orgId,
      clientId,
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      direction: "PRACTICE_TO_CLIENT",
      uploadedBy: session.user.id,
    },
  });

  await db.documentAuditLog.create({
    data: {
      documentId: doc.id,
      action: "uploaded",
      actor: session.user.id,
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    },
  });

  return NextResponse.json({ id: doc.id, name: doc.name }, { status: 201 });
}
