/**
 * Creates three test accounts — one per subscription tier — with active subscriptions.
 * Run: node scripts/create-test-tiers.mjs
 *
 * Credentials:
 *   Solo     › solo@test.SoloSuds.dev     / Test1234!
 *   Practice › practice@test.SoloSuds.dev / Test1234!
 *   Clinic   › clinic@test.SoloSuds.dev   / Test1234!
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PASSWORD = "Test1234!";
const hashed = await bcrypt.hash(PASSWORD, 12);

const tiers = [
  {
    slug: "test-solo",
    orgId: "test-org-solo",
    orgName: "Test Practice – Solo",
    plan: "solo",
    email: "solo@test.SoloSuds.dev",
    userId: "test-user-solo",
    name: "Solo Tester",
  },
  {
    slug: "test-practice",
    orgId: "test-org-practice",
    orgName: "Test Practice – Practice",
    plan: "practice",
    email: "practice@test.SoloSuds.dev",
    userId: "test-user-practice",
    name: "Practice Tester",
  },
  {
    slug: "test-clinic",
    orgId: "test-org-clinic",
    orgName: "Test Practice – Clinic",
    plan: "clinic",
    email: "clinic@test.SoloSuds.dev",
    userId: "test-user-clinic",
    name: "Clinic Tester",
  },
];

for (const tier of tiers) {
  const org = await db.organization.upsert({
    where: { slug: tier.slug },
    create: {
      id: tier.orgId,
      name: tier.orgName,
      slug: tier.slug,
      plan: tier.plan,
      subscriptionStatus: "active",
    },
    update: {
      plan: tier.plan,
      subscriptionStatus: "active",
    },
  });

  await db.user.upsert({
    where: { email: tier.email },
    create: {
      id: tier.userId,
      email: tier.email,
      name: tier.name,
      hashedPassword: hashed,
      role: "OWNER",
      organizationId: org.id,
    },
    update: {
      hashedPassword: hashed,
      role: "OWNER",
      organizationId: org.id,
    },
  });

  console.log(`✅ ${tier.plan.toUpperCase()} › ${tier.email} / ${PASSWORD}`);
}

await db.$disconnect();
console.log("\nAll test tier accounts ready.");
