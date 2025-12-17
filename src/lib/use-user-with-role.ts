"use client";

import { useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

/**
 * Fetch user with role from API
 */
async function fetchUserWithRole() {
  const response = await fetch("/api/users/me");
  if (!response.ok) {
    return null;
  }
  return response.json();
}

/**
 * Hook to get current user with role
 */
export function useUserWithRole() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: user } = useQuery({
    queryKey: ["user-with-role", userId],
    queryFn: fetchUserWithRole,
    enabled: !!userId,
  });

  return {
    user: user || null,
    role: (user?.role as "user" | "admin" | "super_admin") || "user",
  };
}

