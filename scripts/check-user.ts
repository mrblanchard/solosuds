import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter } as any);

async function main() {
  const user = await db.user.findUnique({
    where: { email: "admin@soapsuds.dev" },
    select: { id: true, email: true, hashedPassword: true, role: true, organizationId: true },
  });

  console.log("User found:", JSON.stringify(user, null, 2));

  if (user?.hashedPassword) {
    const match = await bcrypt.compare("Admin1234!", user.hashedPassword);
    console.log("Password match:", match);
  }

  await db.$disconnect();
}

main();
