import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbUrl = (process.env.DATABASE_URL ?? "file:./prisma/dev.db")
  .replace(/^file:/, "")
  .split("?")[0];

const adapter = new PrismaBetterSqlite3({ url: dbUrl, timeout: 5000 });
const prisma = new PrismaClient({ adapter } as never);

// Standalone auth instance for seeding (no nextCookies — not a Next.js context)
const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  plugins: [admin()],
});

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@esqtools.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin";

  // Check if admin already exists to make seed idempotent
  const existing = await (prisma as any).user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`Admin user already exists: ${adminEmail} — skipping seed.`);
    await (prisma as any).$disconnect();
    return;
  }

  // Use signUpEmail to create user (handles password hashing), then promote to admin via Prisma
  await auth.api.signUpEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });

  // Set role to admin — signUpEmail creates with role=null by default
  await (prisma as any).user.update({
    where: { email: adminEmail },
    data: { role: "admin" },
  });

  console.log(`Admin user created: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log("IMPORTANT: Change the password after first login.");

  await (prisma as any).$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
