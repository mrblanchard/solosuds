import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as any);

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run prisma/seed.ts in production — it creates/resets a demo admin account with a publicly-known default password."
    );
  }

  const email = "admin@SoloSuds.dev";
  const password = "Admin1234!";
  const orgName = "SoloSuds Demo Practice";

  // Create org
  const org = await db.organization.upsert({
    where: { slug: "SoloSuds-demo" },
    create: { id: "demo-org", name: orgName, slug: "SoloSuds-demo" },
    update: { name: orgName },
  });

  // Hash password
  const hashed = await bcrypt.hash(password, 12);

  // Create admin user
  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin User",
      hashedPassword: hashed,
      role: "OWNER",
      organizationId: org.id,
    },
    update: {
      hashedPassword: hashed,
      role: "OWNER",
    },
  });

  // Seed some services
  const services = [
    { name: "Initial Consultation", durationMinutes: 60, price: 15000 },
    { name: "Follow-up Session", durationMinutes: 30, price: 7500 },
    { name: "Extended Session", durationMinutes: 90, price: 22000 },
  ];

  for (const s of services) {
    await db.service.upsert({
      where: { id: `demo-service-${s.name.toLowerCase().replace(/\s+/g, "-")}` },
      create: {
        id: `demo-service-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
        organizationId: org.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: s.price,
        isActive: true,
      },
      update: {},
    });
  }

  // Seed a demo client
  await db.client.upsert({
    where: { id: "demo-client-1" },
    create: {
      id: "demo-client-1",
      organizationId: org.id,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      phone: "555-0100",
      status: "ACTIVE",
    },
    update: {},
  });

  console.log(`
✅ Seed complete!

  Organization : ${orgName}
  Login email  : ${email}
  Password     : ${password}

  Navigate to: http://localhost:3000/login
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
