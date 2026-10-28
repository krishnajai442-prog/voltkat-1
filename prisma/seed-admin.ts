import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "VoltKart Admin";

  if (!email || !EMAIL_RE.test(email)) {
    throw new Error(
      "ADMIN_EMAIL is missing or invalid. Set it in .env before running seed:admin.",
    );
  }

  if (!password || password.length < 10) {
    throw new Error(
      "ADMIN_PASSWORD is missing or too short. Use at least 10 characters.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: Role.ADMIN,
      active: true,
      marketingOptIn: false,
      whatsappOptIn: false,
    },
    create: {
      email,
      name,
      passwordHash,
      role: Role.ADMIN,
      active: true,
      marketingOptIn: false,
      whatsappOptIn: false,
    },
  });

  console.log(`Admin user ready: ${admin.email}`);
  console.log("Sign in at /admin/login");
  console.log(
    "After first login, rotate/remove ADMIN_EMAIL and ADMIN_PASSWORD from environment.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });