/**
 * Script to update a user's role in the database
 * 
 * Usage:
 *   npx tsx scripts/update-user-role.ts <user-email> <role>
 * 
 * Example:
 *   npx tsx scripts/update-user-role.ts user@example.com admin
 *   npx tsx scripts/update-user-role.ts user@example.com super_admin
 */

import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function updateUserRole(email: string, roleName: "user" | "admin" | "super_admin") {
  try {
    // Find the role by name
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      console.error(`❌ Role "${roleName}" not found. Please run 'npm run db:seed:abilities' first.`);
      process.exit(1);
    }

    const user = await prisma.user.update({
      where: { email },
      data: {
        role: {
          connect: { id: role.id },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log("✅ User role updated successfully:");
    console.log(JSON.stringify(user, null, 2));
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update does not exist")) {
      console.error(`❌ User with email "${email}" not found`);
    } else {
      console.error("❌ Error updating user role:", error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
const role = process.argv[3] as "user" | "admin" | "super_admin";

if (!email || !role) {
  console.error("Usage: npx tsx scripts/update-user-role.ts <user-email> <role>");
  console.error("Roles: user, admin, super_admin");
  process.exit(1);
}

if (!["user", "admin", "super_admin"].includes(role)) {
  console.error("Invalid role. Must be one of: user, admin, super_admin");
  process.exit(1);
}

updateUserRole(email, role);

