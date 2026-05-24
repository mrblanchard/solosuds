import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  sessionType: z.string().max(200).optional(),
  subjectivePrompt: z.string().optional(),
  objectivePrompt: z.string().optional(),
  assessmentPrompt: z.string().optional(),
  planPrompt: z.string().optional(),
  defaultDiagnosisCodes: z.array(z.string()).optional(),
  defaultProcedureCodes: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await db.noteTemplate.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const orgId = session.user.organizationId;
  const { isDefault, ...rest } = parsed.data;

  // If marking as default, unset any existing default
  if (isDefault) {
    await db.noteTemplate.updateMany({
      where: { organizationId: orgId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await db.noteTemplate.create({
    data: {
      organizationId: orgId,
      ...rest,
      isDefault: isDefault ?? false,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
