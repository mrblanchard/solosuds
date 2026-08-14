// One-off script: creates a permanent, public demo organization solely so
// solosuds.com/book?org=<id> is a stable link to hand Twilio's A2P 10DLC
// campaign reviewers as the opt-in / message_flow URL. Safe to re-run
// (upsert). Does NOT create any login/admin user, unlike prisma/seed.ts.
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const org = await db.organization.upsert({
  where: { slug: "solosuds-demo" },
  create: {
    id: "twilio-demo",
    name: "SoloSuds Demo Practice",
    slug: "solosuds-demo",
  },
  update: { name: "SoloSuds Demo Practice" },
});

await db.service.upsert({
  where: { id: "twilio-demo-service" },
  create: {
    id: "twilio-demo-service",
    organizationId: org.id,
    name: "Initial Consultation",
    durationMinutes: 60,
    price: 15000,
    isActive: true,
  },
  update: { isActive: true },
});

console.log(`\n✅ Demo org ready.\n\nBooking page: https://solosuds.com/book?org=${org.id}\n`);
await db.$disconnect();
