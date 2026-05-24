import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Load .env manually
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

const deletedAccounts = await db.account.deleteMany({
  where: { user: { organizationId: null } },
});
console.log("Deleted orphaned accounts:", deletedAccounts.count);

const deletedUsers = await db.user.deleteMany({
  where: { organizationId: null },
});
console.log("Deleted orphaned users:", deletedUsers.count);

await db.$disconnect();
