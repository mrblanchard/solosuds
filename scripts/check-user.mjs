import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
}

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const email = process.argv[2];
if (!email) { console.error("Usage: node scripts/check-user.ts <email>"); process.exit(1); }

const user = await db.user.findUnique({ where: { email }, include: { accounts: true, organization: true } });
console.log("User:", JSON.stringify(user, null, 2));

const accounts = await db.account.findMany({ where: { user: { email } } });
console.log("Accounts:", JSON.stringify(accounts, null, 2));

await db.$disconnect();
