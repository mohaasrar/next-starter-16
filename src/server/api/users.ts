import { Hono } from "hono";
import { db } from "../db/client";
import { authorize } from "./middlewares";
import type { Variables } from "./types";

export const usersApi = new Hono<{ Variables: Variables }>();

usersApi.get("/", authorize("read", "User"), async (c) => {
  try {
    const data = await db.appUser.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(data);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users. Please check your database connection." }, 500);
  }
});

usersApi.post("/", authorize("create", "User"), async (c) => {
  try {
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

usersApi.put("/:id", authorize("update", "User"), async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    
    const updatedUser = await db.appUser.update({
      where: { id },
      data: body,
    });
    
    return c.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user. Please check your database connection." }, 500);
  }
});

usersApi.delete("/:id", authorize("delete", "User"), async (c) => {
  try {
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
