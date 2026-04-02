import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { generateSoapSections } from "@/lib/openai";
import { z } from "zod";

export const maxDuration = 60;

const schema = z.object({
  transcript: z.string().min(10, "Transcript too short"),
  noteId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Build context from previous notes if noteId provided
  let clientHistory: string | undefined;
  if (parsed.data.noteId) {
    const currentNote = await db.soapNote.findFirst({
      where: { id: parsed.data.noteId, organizationId: orgId },
      select: { clientId: true },
    });

    if (currentNote) {
      const previousNotes = await db.soapNote.findMany({
        where: {
          clientId: currentNote.clientId,
          organizationId: orgId,
          status: { in: ["SIGNED", "LOCKED"] },
          id: { not: parsed.data.noteId },
        },
        orderBy: { sessionDate: "desc" },
        take: 3,
        select: { sessionDate: true, assessment: true, plan: true },
      });

      if (previousNotes.length > 0) {
        clientHistory = previousNotes
          .map(
            (n) =>
              `Session ${n.sessionDate.toISOString().split("T")[0]}:\nAssessment: ${n.assessment}\nPlan: ${n.plan}`
          )
          .join("\n\n");
      }
    }
  }

  try {
    const sections = await generateSoapSections(parsed.data.transcript, {
      clientHistory,
    });

    // Save transcript to note if noteId provided
    if (parsed.data.noteId) {
      await db.soapNote.updateMany({
        where: { id: parsed.data.noteId, organizationId: orgId },
        data: { transcript: parsed.data.transcript, aiSuggestions: sections },
      });
    }

    return NextResponse.json(sections);
  } catch (error) {
    console.error("SOAP generation error:", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
