import { Hono } from "hono";
import { db } from "../db/client";
import { authorize } from "./middlewares";
import type { Variables } from "./types";

export const authUsersApi = new Hono<{ Variables: Variables }>();

// Get all Better Auth users
authUsersApi.get("/", authorize("read", "User"), async (c) => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    // Transform users to include role name as string
    const usersWithRole = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role?.name || "user",
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return c.json(usersWithRole);
  } catch (error) {
    console.error("Error fetching auth users:", error);
    return c.json({ error: "Failed to fetch users. Please check your database connection." }, 500);
  }
});

// Create Better Auth user
authUsersApi.post("/", authorize("create", "User"), async (c) => {
  try {
    const body = await c.req.json();

    // Create user directly in database
    // Note: For Better Auth, users should ideally be created through the registration flow
    // This is for admin user creation
    const roleName = body.role || "user";
    const role = await db.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      return c.json({ error: `Role "${roleName}" not found` }, 400);
    }

    const newUser = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        emailVerified: false,
        role: {
          connect: { id: role.id },
        },
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    // Transform to include role name as string
    const userWithRole = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
      role: newUser.role?.name || "user",
      image: newUser.image,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return c.json(userWithRole, 201);
  } catch (error) {
    console.error("Error creating auth user:", error);
    return c.json({ error: "Failed to create user. Please check your database connection." }, 500);
  }
});

// Update Better Auth user
authUsersApi.put("/:id", authorize("update", "User"), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // Validate role
    const validRoles = ["user", "admin", "super_admin"];
    if (body.role && !validRoles.includes(body.role)) {
      return c.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, 400);
    }

    // Build update data
    const updateData: {
      name: string;
      email: string;
      role?: { connect: { name: string } };
    } = {
      name: body.name,
      email: body.email,
    };

    if (body.role !== undefined) {
      updateData.role = {
        connect: { name: body.role },
      };
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    // Transform to include role name as string
    const userWithRole = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      emailVerified: updatedUser.emailVerified,
      role: updatedUser.role?.name || "user",
      image: updatedUser.image,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return c.json(userWithRole);
  } catch (error) {
    console.error("Error updating auth user:", error);
    return c.json({ error: "Failed to update user. Please check your database connection." }, 500);
  }
});

