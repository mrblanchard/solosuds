import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalPhone = z
  .string()
  .regex(/^[+]?[\d\s()-]{7,20}$/)
  .or(z.literal(""))
  .optional()
  .transform((v) => v || undefined);

const rowSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z
    .string()
    .email()
    .max(254)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  phone: optionalPhone,
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .optional()
    .transform((v) => v || undefined),
  gender: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v || undefined),
  pronouns: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v || undefined),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
  city: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || undefined),
  state: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || undefined),
  zip: z
    .string()
    .regex(/^[A-Za-z0-9\s-]{3,10}$/)
    .or(z.literal(""))
    .optional()
    .transform((v) => v || undefined),
  country: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || undefined),
  emergencyName: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v || undefined),
  emergencyPhone: optionalPhone,
  referralSource: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v || undefined),
  internalNotes: z
    .string()
    .max(5000)
    .optional()
    .transform((v) => v || undefined),
});

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header — handle quoted fields
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

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// Map common CSV header variations to our schema fields
const HEADER_MAP: Record<string, string> = {
  "first name": "firstName",
  "first_name": "firstName",
  firstname: "firstName",
  "last name": "lastName",
  "last_name": "lastName",
  lastname: "lastName",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  "phone_number": "phone",
  "date of birth": "dateOfBirth",
  "date_of_birth": "dateOfBirth",
  dob: "dateOfBirth",
  birthday: "dateOfBirth",
  gender: "gender",
  pronouns: "pronouns",
  address: "address",
  "street address": "address",
  street: "address",
  city: "city",
  state: "state",
  province: "state",
  zip: "zip",
  "zip code": "zip",
  zipcode: "zip",
  postal: "zip",
  "postal code": "zip",
  country: "country",
  "emergency contact": "emergencyName",
  "emergency name": "emergencyName",
  "emergency_name": "emergencyName",
  "emergency phone": "emergencyPhone",
  "emergency_phone": "emergencyPhone",
  referral: "referralSource",
  "referral source": "referralSource",
  "referral_source": "referralSource",
  notes: "internalNotes",
  "internal notes": "internalNotes",
  "internal_notes": "internalNotes",
};

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

  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const text = await file.text();
  const rawRows = parseCSV(text);

  if (rawRows.length === 0)
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });

  if (rawRows.length > 500)
    return NextResponse.json(
      { error: "Too many rows (max 500 per import)" },
      { status: 400 }
    );

  // Build column mapping: either from user-provided mapping or auto-detect
  let mapping: Record<string, string> = {};
  if (mappingRaw) {
    try {
      mapping = JSON.parse(mappingRaw);
    } catch {
      return NextResponse.json({ error: "Invalid mapping" }, { status: 400 });
    }
  } else {
    // Auto-detect from headers
    const headers = Object.keys(rawRows[0]);
    for (const h of headers) {
      const normalized = h.toLowerCase().trim();
      if (HEADER_MAP[normalized]) {
        mapping[h] = HEADER_MAP[normalized];
      }
    }
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as { row: number; message: string }[],
  };

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const mapped: Record<string, string> = {};

    for (const [csvCol, schemaField] of Object.entries(mapping)) {
      if (raw[csvCol] !== undefined && raw[csvCol] !== "") {
        mapped[schemaField] = raw[csvCol];
      }
    }

    const parsed = rowSchema.safeParse(mapped);
    if (!parsed.success) {
      results.errors.push({
        row: i + 2, // +2 for 1-indexed + header row
        message: Object.values(parsed.error.flatten().fieldErrors).flat().join(", "),
      });
      results.skipped++;
      continue;
    }

    try {
      const { dateOfBirth, ...data } = parsed.data;
      await db.client.create({
        data: {
          ...data,
          organizationId: orgId,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        },
      });
      results.imported++;
    } catch {
      results.errors.push({ row: i + 2, message: "Database error" });
      results.skipped++;
    }
  }

  return NextResponse.json(results);
}
