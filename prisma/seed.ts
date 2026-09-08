import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL dan ADMIN_PASSWORD di .env sebelum menjalankan seed.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: await bcrypt.hash(password, 12) },
    create: {
      email,
      name: process.env.ADMIN_NAME ?? "Admin",
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  console.log(`Admin siap: ${user.email}`);
}

main().finally(() => prisma.$disconnect());
