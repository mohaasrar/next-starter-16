import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Please configure your database connection in .env file.");
}

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting database seed...");

  // Get the email from environment variable or use a default
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    // Update existing user to super_admin
    if (existingAdmin.role !== "super_admin") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "super_admin" },
      });
      console.log(`✅ Updated user ${adminEmail} to super_admin role`);
    } else {
      console.log(`ℹ️  User ${adminEmail} already has super_admin role`);
    }
  } else {
    console.log(`⚠️  User ${adminEmail} does not exist.`);
    console.log(`   Please register this user first, then run this seed again to update their role.`);
    console.log(`   Or set SEED_ADMIN_EMAIL to an existing user's email.`);
    console.log(`   Example: SEED_ADMIN_EMAIL=your-email@example.com npm run db:seed`);
  }

  // Also update the first user in the database to super_admin if no specific email was provided
  if (!existingAdmin) {
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });
    
    if (firstUser && firstUser.role !== "super_admin") {
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: "super_admin" },
      });
      console.log(`✅ Updated first user (${firstUser.email}) to super_admin role`);
    } else if (firstUser) {
      console.log(`ℹ️  First user (${firstUser.email}) already has super_admin role`);
    }
  }

  console.log("✨ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
