import { describe, it, expect } from "vitest";
import { userSchema } from "@/features/users/schema";

describe("userSchema", () => {
  it("should validate a valid user", () => {
    const validUser = {
      name: "John Doe",
      email: "john@example.com",
      role: "user" as const,
    };

    const result = userSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const invalidUser = {
      name: "John Doe",
      email: "invalid-email",
      role: "user" as const,
    };

    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const invalidUser = {
      name: "",
      email: "john@example.com",
      role: "user" as const,
    };

    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it("should default role to 'user'", () => {
    const userWithoutRole = {
      name: "John Doe",
      email: "john@example.com",
    };

    const result = userSchema.parse(userWithoutRole);
    expect(result.role).toBe("user");
  });

  it("should accept valid roles", () => {
    const roles = ["user", "admin", "super_admin"] as const;
    
    roles.forEach((role) => {
      const user = {
        name: "John Doe",
        email: "john@example.com",
        role,
      };

      const result = userSchema.safeParse(user);
      expect(result.success).toBe(true);
    });
  });
});

