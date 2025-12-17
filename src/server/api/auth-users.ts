import { Hono } from "hono";
import { db } from "../db/client";
import { getCurrentUser } from "../auth/get-session";
import { defineAbility } from "../auth/casl";

export const authUsersApi = new Hono();

// Get all Better Auth users
authUsersApi.get("/", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("read", "User")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return c.json(users);
  } catch (error) {
    console.error("Error fetching auth users:", error);
    return c.json({ error: "Failed to fetch users. Please check your database connection." }, 500);
  }
});

// Create Better Auth user
authUsersApi.post("/", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("create", "User")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();

    // Create user directly in database
    // Note: For Better Auth, users should ideally be created through the registration flow
    // This is for admin user creation
    const newUser = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role || "user",
        emailVerified: false,
      },
    });

    return c.json(newUser, 201);
  } catch (error) {
    console.error("Error creating auth user:", error);
    return c.json({ error: "Failed to create user. Please check your database connection." }, 500);
  }
});

// Update Better Auth user
authUsersApi.put("/:id", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("update", "User")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const id = c.req.param("id");
    const body = await c.req.json();

    console.log("Update request body:", JSON.stringify(body, null, 2));
    console.log("Role value:", body.role);
    console.log("Role type:", typeof body.role);

    // Validate role
    const validRoles = ["user", "admin", "super_admin"];
    if (body.role && !validRoles.includes(body.role)) {
      return c.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, 400);
    }

    // Only allow updating name, email, and role
    const updateData: { name: string; email: string; role?: string } = {
      name: body.name,
      email: body.email,
    };

    if (body.role !== undefined) {
      updateData.role = body.role;
    }

    console.log("Update data:", JSON.stringify(updateData, null, 2));

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    });

    console.log("Updated user:", JSON.stringify(updatedUser, null, 2));
    console.log("Updated user role:", updatedUser.role);

    return c.json(updatedUser);
  } catch (error) {
    console.error("Error updating auth user:", error);
    return c.json({ error: "Failed to update user. Please check your database connection." }, 500);
  }
});

