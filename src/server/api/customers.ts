import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { authorize } from "./middlewares";
import type { Variables } from "./types";
import { customerSchema } from "@/features/customers/schema";

export const customersApi = new Hono<{ Variables: Variables }>();

customersApi.get("/", authorize("read", "Customer"), async (c) => {
  try {
    const data = await db.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(data);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return c.json({ error: "Failed to fetch customers. Please check your database connection." }, 500);
  }
});

customersApi.post(
  "/",
  authorize("create", "Customer"),
  zValidator("json", customerSchema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      console.log("Creating customer with data:", body);
      
      // Transform empty strings to null for Prisma
      const customerData = {
        ...body,
        email: body.email === "" ? null : body.email,
        phone: body.phone === "" ? null : body.phone,
        address: body.address === "" ? null : body.address,
        city: body.city === "" ? null : body.city,
        country: body.country === "" ? null : body.country,
        postalCode: body.postalCode === "" ? null : body.postalCode,
        notes: body.notes === "" ? null : body.notes,
      };
      
      const newCustomer = await db.customer.create({
        data: customerData,
      });
      
      console.log("Customer created successfully:", newCustomer);
      return c.json(newCustomer, 201);
    } catch (error) {
      console.error("Error creating customer:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return c.json({ 
        error: "Failed to create customer", 
        message: error instanceof Error ? error.message : "Unknown error",
        details: error 
      }, 500);
    }
  }
);

customersApi.put(
  "/:id",
  authorize("update", "Customer"),
  zValidator("json", customerSchema),
  async (c) => {
    try {
      const id = Number(c.req.param("id"));
      const body = c.req.valid("json");
      
      // Transform empty strings to null for Prisma
      const customerData = {
        ...body,
        email: body.email === "" ? null : body.email,
        phone: body.phone === "" ? null : body.phone,
        address: body.address === "" ? null : body.address,
        city: body.city === "" ? null : body.city,
        country: body.country === "" ? null : body.country,
        postalCode: body.postalCode === "" ? null : body.postalCode,
        notes: body.notes === "" ? null : body.notes,
      };
      
      const updatedCustomer = await db.customer.update({
        where: { id },
        data: customerData,
      });
      
      return c.json(updatedCustomer);
    } catch (error) {
      console.error("Error updating customer:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      return c.json({ 
        error: "Failed to update customer",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }
  }
);

customersApi.delete("/:id", authorize("delete", "Customer"), async (c) => {
  try {
    const id = Number(c.req.param("id"));
    await db.customer.delete({
      where: { id },
    });
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return c.json({ error: "Failed to delete customer. Please check your database connection." }, 500);
  }
});
