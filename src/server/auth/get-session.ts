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
        image: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      console.warn("User not found in database for session user:", session.user.id);
      return {
        ...session.user,
        role: "user" as const,
      };
    }

    // Get role name, default to "user" if no role assigned
    const roleName = (user.role?.name as "user" | "admin" | "super_admin") || "user";

    console.log("Current user fetched:", {
      id: user.id,
      email: user.email,
      role: roleName,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: roleName,
    };
  } catch (error) {
    console.error("Error fetching user from database:", error);
    // Fallback to session user without role
    return {
      ...session.user,
      role: "user" as const,
    };
  }
}

