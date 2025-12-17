import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "../db/client";
import { env } from "@/lib/env";

export const auth = betterAuth({
  database: env.DATABASE_URL
    ? prismaAdapter(db, {
        provider: "postgresql",
      })
    : undefined,
  secret: env.BETTER_AUTH_SECRET || "dev-secret-key-change-in-production",
  baseURL: env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
});

