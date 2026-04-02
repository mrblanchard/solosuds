import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/openai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate file size (max 25MB — Whisper limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file too large (max 25MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const transcript = await transcribeAudio(buffer);

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
