import { Hono } from "hono";
import { db } from "../db/client";
import { getCurrentUser } from "../auth/get-session";
import { defineAbility } from "../auth/casl";

export const usersApi = new Hono();

usersApi.get("/", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("read", "User")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const data = await db.appUser.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(data);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users. Please check your database connection." }, 500);
  }
});

usersApi.post("/", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("create", "User")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();
    const newUser = await db.appUser.create({
      data: body,
    });
    return c.json(newUser, 201);
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ error: "Failed to create user. Please check your database connection." }, 500);
  }
});

usersApi.put("/:id", async (c) => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return c.json({ error: "Unauthorized: No user session" }, 401);
    }

    console.log("Current user attempting update:", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const ability = defineAbility({
      role: (user.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("update", "User")) {
      console.log("Authorization failed. User role:", user.role, "cannot update users");
      return c.json({ 
        error: "Forbidden: You don't have permission to update users. Required role: admin or super_admin",
        userRole: user.role 
      }, 403);
    }

    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    
    console.log("Update user request - ID:", id);
    console.log("Update user request - Body:", JSON.stringify(body, null, 2));
    
    const updatedUser = await db.appUser.update({
      where: { id },
      data: body,
    });
    
    console.log("Updated user:", JSON.stringify(updatedUser, null, 2));
    
    return c.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user. Please check your database connection." }, 500);
  }
});

usersApi.delete("/:id", async (c) => {
  try {
    const user = await getCurrentUser();
    const ability = defineAbility({
      role: (user?.role as "user" | "admin" | "super_admin") || "user",
    });

    if (!ability.can("delete", "User")) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const id = Number(c.req.param("id"));
    await db.appUser.delete({
      where: { id },
    });
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user. Please check your database connection." }, 500);
  }
});
