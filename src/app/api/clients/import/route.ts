import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  IMPORT_LIMITS,
  autoDetectMapping,
  identityKey,
  isPlausiblePhone,
  parseDate,
  parseLine,
  splitFullName,
  stripBom,
} from "@/lib/client-import";

const optionalPhone = z
  .string()
  .max(40)
  .refine((v) => v === "" || isPlausiblePhone(v), {
    message: "not a recognizable phone number",
  })
  .optional()
  .transform((v) => v || undefined);

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const rowSchema = z.object({
  firstName: z.string().min(1, "first name is required").max(100),
  // Blank is allowed: some clients genuinely go by a single name, and a
  // full-name column with one word should not fail the whole row.
  lastName: z.string().max(100),
  email: z
    .string()
    .email("not a valid email address")
    .max(254)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  phone: optionalPhone,
  // Already normalized to YYYY-MM-DD by parseDate before validation.
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => v || undefined),
  gender: optionalText(50),
  pronouns: optionalText(50),
  address: optionalText(500),
  city: optionalText(100),
  state: optionalText(100),
  zip: z
    .string()
    .max(20)
    .optional()
    .transform((v) => v || undefined),
  country: optionalText(100),
  emergencyName: optionalText(200),
  emergencyPhone: optionalPhone,
  referralSource: optionalText(200),
  internalNotes: optionalText(5000),
});

type ImportRow = z.infer<typeof rowSchema>;

function parseCSV(text: string): Record<string, string>[] {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (values[i] ?? "").trim();
    });
    return record;
  });
}

const INSERT_CHUNK_SIZE = 200;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  if (!orgId)
    return NextResponse.json({ error: "No organization" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mappingRaw = formData.get("mapping") as string | null;

  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > IMPORT_LIMITS.maxBytes)
    return NextResponse.json(
      { error: `File too large (max ${IMPORT_LIMITS.maxBytes / 1024 / 1024}MB)` },
      { status: 400 }
    );

  const text = await file.text();
  const rawRows = parseCSV(text);

  if (rawRows.length === 0)
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });

  if (rawRows.length > IMPORT_LIMITS.maxRows)
    return NextResponse.json(
      {
        error: `Too many rows (max ${IMPORT_LIMITS.maxRows} per import). Split the file and import it in parts.`,
      },
      { status: 400 }
    );

  let mapping: Record<string, string> = {};
  if (mappingRaw) {
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {
      return NextResponse.json({ error: "Invalid mapping" }, { status: 400 });
    }
  } else {
    mapping = autoDetectMapping(Object.keys(rawRows[0]));
  }

  // Existing clients, so a re-run of the same file does not duplicate anyone.
  const existing = await db.client.findMany({
    where: { organizationId: orgId },
    select: { email: true, firstName: true, lastName: true, phone: true },
  });

  const seenEmails = new Set<string>();
  const seenIdentities = new Set<string>();
  for (const c of existing) {
    if (c.email) seenEmails.add(c.email.toLowerCase());
    seenIdentities.add(identityKey(c.firstName, c.lastName, c.phone ?? undefined));
  }

  const results = {
    imported: 0,
    skipped: 0,
    duplicates: 0,
    errors: [] as { row: number; message: string }[],
  };

  const pending: { rowNumber: number; data: ImportRow }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNumber = i + 2; // 1-indexed, plus the header row
    const mapped: Record<string, string> = {};

    for (const [csvCol, schemaField] of Object.entries(mapping)) {
      if (raw[csvCol] !== undefined && raw[csvCol] !== "") {
        mapped[schemaField] = raw[csvCol];
      }
    }

    // A single name column fills in whichever of first/last is missing.
    if (mapped.fullName) {
      const split = splitFullName(mapped.fullName);
      if (!mapped.firstName) mapped.firstName = split.firstName;
      if (!mapped.lastName) mapped.lastName = split.lastName;
      delete mapped.fullName;
    }
    if (mapped.lastName === undefined) mapped.lastName = "";

    // Normalize the date before validation so US-formatted exports survive.
    if (mapped.dateOfBirth) {
      const normalized = parseDate(mapped.dateOfBirth);
      if (!normalized) {
        results.errors.push({
          row: rowNumber,
          message: `could not read date of birth "${mapped.dateOfBirth}"`,
        });
        delete mapped.dateOfBirth;
      } else {
        mapped.dateOfBirth = normalized;
      }
    }

    const parsed = rowSchema.safeParse(mapped);
    if (!parsed.success) {
      results.errors.push({
        row: rowNumber,
        message: Object.entries(parsed.error.flatten().fieldErrors)
          .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(", ")}`)
          .join("; "),
      });
      results.skipped++;
      continue;
    }

    const { email, firstName, lastName, phone } = parsed.data;
    const emailKey = email?.toLowerCase();
    const idKey = identityKey(firstName, lastName, phone);

    if (emailKey && seenEmails.has(emailKey)) {
      results.duplicates++;
      continue;
    }
    if (!emailKey && seenIdentities.has(idKey)) {
      results.duplicates++;
      continue;
    }

    if (emailKey) seenEmails.add(emailKey);
    seenIdentities.add(idKey);

    pending.push({ rowNumber, data: parsed.data });
  }

  // Batched inserts: one round trip per chunk instead of one per row.
  for (let i = 0; i < pending.length; i += INSERT_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + INSERT_CHUNK_SIZE);
    const payload = chunk.map(({ data }) => {
      const { dateOfBirth, ...rest } = data;
      return {
        ...rest,
        organizationId: orgId,
        dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : undefined,
      };
    });

    try {
      const created = await db.client.createMany({ data: payload });
      results.imported += created.count;
    } catch {
      // Fall back to one at a time so a single bad row cannot lose the chunk,
      // and so the failure can be reported against its actual line number.
      for (const { rowNumber, data } of chunk) {
        const { dateOfBirth, ...rest } = data;
        try {
          await db.client.create({
            data: {
              ...rest,
              organizationId: orgId,
              dateOfBirth: dateOfBirth
                ? new Date(`${dateOfBirth}T00:00:00.000Z`)
                : undefined,
            },
          });
          results.imported++;
        } catch {
          results.errors.push({ row: rowNumber, message: "database error" });
          results.skipped++;
        }
      }
    }
  }

  return NextResponse.json(results);
}
