import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🔄 Migrating roles from string to Role model...");

  // First, create roles if they don't exist
  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: {
      name: "user",
      description: "Regular user with limited permissions",
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "Administrator with elevated permissions",
    },
  });

  const superAdminRole = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: {
      name: "super_admin",
      description: "Super administrator with full access",
    },
  });

  console.log("✅ Roles created");

  // Get all users and migrate their role field to roleId
  // Note: This assumes the role field still exists temporarily
  // We'll need to use raw SQL to read the old role field
  const users = await prisma.$queryRaw<Array<{ id: string; role: string }>>`
    SELECT id, role FROM "user" WHERE role IS NOT NULL
  `;

  for (const user of users) {
    let roleId: string;
    
    if (user.role === "admin") {
      roleId = adminRole.id;
    } else if (user.role === "super_admin") {
      roleId = superAdminRole.id;
    } else {
      roleId = userRole.id;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { roleId },
    });
  }

  console.log(`✅ Migrated ${users.length} users to Role model`);

  console.log("✨ Migration completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error migrating roles:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

