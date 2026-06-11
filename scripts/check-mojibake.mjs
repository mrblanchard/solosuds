import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
config();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const pattern = "%â€%";

const checks = [
  ["Organization", "name"],
  ["Organization", "address"],
  ["Organization", "emailSignature"],
  ["Organization", "brandFont"],
  ["User", "name"],
  ["User", "bio"],
  ["User", "title"],
  ["Client", "firstName"],
  ["Client", "lastName"],
  ["Client", "address"],
  ["Client", "city"],
  ["Client", "state"],
  ["Client", "country"],
  ["Client", "emergencyName"],
  ["Client", "referralSource"],
  ["Client", "internalNotes"],
  ["Client", "pronouns"],
  ["Service", "name"],
  ["Service", "description"],
  ["Room", "name"],
  ["Appointment", "notes"],
  ["SoapNote", "subjective"],
  ["SoapNote", "objective"],
  ["SoapNote", "assessment"],
  ["SoapNote", "plan"],
  ["SoapNote", "sessionNotes"],
  ["NoteTemplate", "name"],
  ["NoteTemplate", "subjectivePrompt"],
  ["NoteTemplate", "objectivePrompt"],
  ["NoteTemplate", "assessmentPrompt"],
  ["NoteTemplate", "planPrompt"],
  ["IntakeForm", "title"],
  ["IntakeForm", "description"],
  ["Invoice", "notes"],
  ["Message", "content"],
  ["Email", "subject"],
  ["Email", "textBody"],
  ["Task", "title"],
  ["Task", "description"],
];

let found = 0;
for (const [table, column] of checks) {
  const rows = await db.$queryRawUnsafe(
    `SELECT id, "${column}" as val FROM "${table}" WHERE "${column}" ILIKE $1 LIMIT 5`,
    pattern
  );
  for (const row of rows) {
    found++;
    console.log(`${table}.${column} (id=${row.id}): ${String(row.val).slice(0, 120)}`);
  }
}

if (found === 0) console.log("No mojibake (â€) found in checked text columns.");
await db.$disconnect();
