import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, content, channel = "EMAIL" } = body;

    if (!clientId || !content) {
      return NextResponse.json({ error: "clientId and content are required" }, { status: 400 });
    }

    // Verify client belongs to org
    const client = await db.client.findFirst({
      where: { id: clientId, organizationId: session.user.organizationId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const message = await db.message.create({
      data: {
        organizationId: session.user.organizationId,
        clientId,
        senderId: session.user.id,
        content,
        channel,
        direction: "OUTBOUND",
        status: "SENT",
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[POST /api/messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    const messages = await db.message.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(clientId && { clientId }),
      },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[GET /api/messages]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
