import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { db } from "@/lib/db";
import { uploadFile, getSignedDownloadUrl } from "@/lib/storage";
import { validateUploadedFile } from "@/lib/file-validation";
import { randomUUID } from "crypto";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// GET — list documents for this client (both directions)
export async function GET(_request: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await db.document.findMany({
    where: { clientId: session.clientId, organizationId: session.orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      sizeBytes: true,
      direction: true,
      createdAt: true,
    },
  });

  return NextResponse.json(docs);
}

// POST — upload a document from the client
export async function POST(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 413 });
  }

  const ext = validateUploadedFile(file);
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  const storageKey = `orgs/${session.orgId}/clients/${session.clientId}/${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadFile({ key: storageKey, body: buffer, contentType: file.type });

  const doc = await db.document.create({
    data: {
      organizationId: session.orgId,
      clientId: session.clientId,
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey,
      direction: "CLIENT_TO_PRACTICE",
      uploadedBy: "client",
    },
  });

  await db.documentAuditLog.create({
    data: {
      documentId: doc.id,
      action: "uploaded",
      actor: "client",
      ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
    },
  });

  return NextResponse.json({ id: doc.id, name: doc.name }, { status: 201 });
}
