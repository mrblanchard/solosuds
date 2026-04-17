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
const Stripe = require("stripe");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });
const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY);

const email = process.argv[2];
if (!email) { console.error("Usage: node scripts/fix-subscription.mjs <email>"); process.exit(1); }

const user = await db.user.findUnique({
  where: { email },
  include: { organization: true },
});

if (!user) { console.error("User not found:", email); process.exit(1); }

const org = user.organization;
console.log("Org:", org.id, "| status:", org.subscriptionStatus, "| plan:", org.plan);
console.log("Stripe subscription ID:", org.stripeSubscriptionId);

if (org.stripeSubscriptionId) {
  const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
  console.log("Stripe status:", sub.status, "| pause_collection:", sub.pause_collection);

  // Resume if paused on Stripe side
  if (sub.pause_collection) {
    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      pause_collection: null,
    });
    console.log("✓ Resumed Stripe subscription");
  }

  // Sync DB status with Stripe
  await db.organization.update({
    where: { id: org.id },
    data: { subscriptionStatus: sub.canceled_at ? "canceled" : "active" },
  });
  console.log("✓ DB subscriptionStatus set to:", sub.canceled_at ? "canceled" : "active");
} else {
  // No Stripe sub — just reset to active for dev
  await db.organization.update({
    where: { id: org.id },
    data: { subscriptionStatus: "active" },
  });
  console.log("✓ DB subscriptionStatus set to: active (no Stripe sub found)");
}

await db.$disconnect();
console.log("Done. You can now log in normally.");
