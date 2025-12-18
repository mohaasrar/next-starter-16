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
  console.log("🌱 Seeding roles and abilities...");

  // Create roles
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

  // Create abilities for User role
  const userAbilities: Array<{
    subject: string;
    action: string;
    conditions: null;
    fields: string[];
    inverted: boolean;
    reason: null;
  }> = [
    {
      subject: "User",
      action: "read",
      conditions: null,
      fields: [],
      inverted: false,
      reason: null,
    },
    {
      subject: "Settings",
      action: "read",
      conditions: null,
      fields: [],
      inverted: false,
      reason: null,
    },
    {
      subject: "User",
      action: "create",
      conditions: null,
      fields: [],
      inverted: true,
      reason: null,
    },
    {
      subject: "User",
      action: "update",
      conditions: null,
      fields: [],
      inverted: true,
      reason: null,
    },
    {
      subject: "User",
      action: "delete",
      conditions: null,
      fields: [],
      inverted: true,
      reason: null,
    },
    {
      subject: "Settings",
      action: "update",
      conditions: null,
      fields: [],
      inverted: true,
      reason: null,
    },
  ];

  for (const abilityData of userAbilities) {
    const abilityId = `${userRole.id}-${abilityData.subject}-${abilityData.action}`;
    const ability = await prisma.ability.upsert({
      where: {
        id: abilityId,
      },
      update: {},
      create: {
        id: abilityId,
        subject: abilityData.subject,
        action: abilityData.action,
        conditions: abilityData.conditions ?? undefined,
        fields: abilityData.fields,
        inverted: abilityData.inverted,
        reason: abilityData.reason ?? undefined,
      },
    });
    
    // Connect role to ability
    await prisma.role.update({
      where: { id: userRole.id },
      data: {
        abilities: {
          connect: { id: ability.id },
        },
      },
    });
  }

  // Create abilities for Admin role
  const adminAbilities: Array<{
    subject: string;
    action: string;
    conditions: null;
    fields: string[];
    inverted: boolean;
    reason: null;
  }> = [
    {
      subject: "User",
      action: "manage",
      conditions: null,
      fields: [],
      inverted: false,
      reason: null,
    },
    {
      subject: "Settings",
      action: "read",
      conditions: null,
      fields: [],
      inverted: false,
      reason: null,
    },
    {
      subject: "Settings",
      action: "update",
      conditions: null,
      fields: [],
      inverted: false,
      reason: null,
    },
  ];

  for (const abilityData of adminAbilities) {
    const abilityId = `${adminRole.id}-${abilityData.subject}-${abilityData.action}`;
    const ability = await prisma.ability.upsert({
      where: {
        id: abilityId,
      },
      update: {},
      create: {
        id: abilityId,
        subject: abilityData.subject,
        action: abilityData.action,
        conditions: abilityData.conditions ?? undefined,
        fields: abilityData.fields,
        inverted: abilityData.inverted,
        reason: abilityData.reason ?? undefined,
      },
    });
    
    // Connect role to ability
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        abilities: {
          connect: { id: ability.id },
        },
      },
    });
  }

  // Create abilities for Super Admin role
  const superAdminAbilities: Array<{
    subject: string;
    action: string;
    conditions: null;
    fields: string[];
    inverted: boolean;
    reason: null;
  }> = [
    {
      subject: "all",
      action: "manage",
      conditions: null,
      fields: [],
      inverted: false,
      reason: null,
    },
  ];

  for (const abilityData of superAdminAbilities) {
    const abilityId = `${superAdminRole.id}-${abilityData.subject}-${abilityData.action}`;
    const ability = await prisma.ability.upsert({
      where: {
        id: abilityId,
      },
      update: {},
      create: {
        id: abilityId,
        subject: abilityData.subject,
        action: abilityData.action,
        conditions: abilityData.conditions ?? undefined,
        fields: abilityData.fields,
        inverted: abilityData.inverted,
        reason: abilityData.reason ?? undefined,
      },
    });
    
    // Connect role to ability
    await prisma.role.update({
      where: { id: superAdminRole.id },
      data: {
        abilities: {
          connect: { id: ability.id },
        },
      },
    });
  }

  console.log("✅ Abilities created");

  // Assign default "user" role to users without a role
  const usersWithoutRole = await prisma.user.findMany({
    where: {
      roleId: null,
    },
  });

  for (const user of usersWithoutRole) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        roleId: userRole.id,
      },
    });
  }

  console.log(`✅ ${usersWithoutRole.length} users assigned to default role`);

  console.log("✨ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding abilities:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

