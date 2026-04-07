import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
config();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });
const orgs = await db.organization.findMany({ select: { name: true, slug: true } });
orgs.forEach(o => console.log(`${o.name}  ->  /portal/${o.slug}`));
await db.$disconnect();
