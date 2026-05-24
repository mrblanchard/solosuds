import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signPortalSession, portalSessionCookieOptions } from "@/lib/portal-session";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orgSlug, contact, code } = body as {
    orgSlug?: string;
    contact?: string;
    code?: string;
  };

  if (!orgSlug || !contact || !code) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalized = contact.trim().toLowerCase();

  const org = await db.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const client = await db.client.findFirst({
    where: {
      organizationId: org.id,
      OR: [
        { email: normalized },
        { phone: contact.trim() },
        { phone: normalized },
      ],
    },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const otp = await db.clientPortalOTP.findFirst({
    where: {
      clientId: client.id,
      orgId: org.id,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return NextResponse.json({ error: "Code expired or already used" }, { status: 401 });
  }

  const valid = await bcrypt.compare(code.trim(), otp.codeHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  // Mark as used
  await db.clientPortalOTP.update({ where: { id: otp.id }, data: { used: true } });

  const token = await signPortalSession({ clientId: client.id, orgId: org.id });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(portalSessionCookieOptions(token));
  return response;
}
