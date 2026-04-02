import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const blob = new Blob([audioBuffer as unknown as ArrayBuffer], { type: "audio/webm" });
  const file = new File([blob], "recording.webm", {
    type: "audio/webm",
  });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
  });

  return transcription;
}

export async function generateSoapSections(
  transcript: string,
  context?: { templatePrompts?: Record<string, string>; clientHistory?: string }
): Promise<{
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}> {
  const systemPrompt = `You are a clinical documentation assistant. Given a session transcript, extract and structure the SOAP note sections. Be concise, accurate, and use clinical language. Only include information explicitly mentioned in the transcript.`;

  const userPrompt = `Transcript:
${transcript}

${context?.clientHistory ? `Previous session context:\n${context.clientHistory}\n` : ""}

Please extract and return a JSON object with these exact keys:
- subjective: Patient-reported symptoms, concerns, and history
- objective: Measurable findings, observations, vitals, test results
- assessment: Clinical interpretation and diagnosis
- plan: Treatment plan, interventions, and follow-up actions

Return only valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No content from OpenAI");

  return JSON.parse(content);
}

export async function suggestTags(
  noteContent: string
): Promise<string[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a clinical tagging assistant. Return a JSON array of 3-8 relevant clinical tags for the given note content. Tags should be concise (1-3 words).",
      },
      {
        role: "user",
        content: `Note: ${noteContent}\n\nReturn only a JSON array of tag strings.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content);
  return parsed.tags ?? parsed ?? [];
}
