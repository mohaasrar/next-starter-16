import { auth } from "./better-auth";
import { headers } from "next/headers";
import { db } from "../db/client";

/**
 * Get current session from Better Auth
 */
export async function getSession() {
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";
    
    const session = await auth.api.getSession({
      headers: {
        cookie: cookieHeader,
      },
    });

    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Get current user from session with role from database
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  // Fetch user from database to get role
  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
    });

    if (!user) {
      console.warn("User not found in database for session user:", session.user.id);
      return {
        ...session.user,
        role: "user" as const,
      };
    }

    // Ensure role is set, default to "user" if null/undefined
    if (!user.role) {
      console.warn("User role is null/undefined, defaulting to 'user' for:", user.email);
      user.role = "user";
    }

    console.log("Current user fetched:", {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return user;
  } catch (error) {
    console.error("Error fetching user from database:", error);
    // Fallback to session user without role
    return {
      ...session.user,
      role: "user" as const,
    };
  }
}

