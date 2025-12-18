import { Context, Next } from "hono";
import { auth } from "@/server/auth/better-auth";
import type { Variables } from "../types";

export const authenticationMiddleware = async (
  c: Context<{ Variables: Variables }>,
  next: Next
) => {
  try {
    const headersList = c.req.raw.headers;
    const cookieHeader = headersList.get("cookie") || "";

    const session = await auth.api.getSession({
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!session) {
      c.set("user", null);
      c.set("session", null);
      return next();
    }

    c.set("user", session.user);
    c.set("session", session.session);
    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    c.set("user", null);
    c.set("session", null);
    return next();
  }
};

