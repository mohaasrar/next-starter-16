import { defineAbility, type AppAbility, type User } from "@/server/auth/casl";
import { useUserWithRole } from "./use-user-with-role";
import { useMemo } from "react";

/**
 * Get user's ability based on their role
 */
export const getUserAbility = (user: User | null | undefined): AppAbility => {
  if (!user) {
    // Guest user - no permissions
    return defineAbility({ role: "user" });
  }

  return defineAbility({
    role: (user.role as "user" | "admin" | "super_admin") || "user",
  });
};

/**
 * React hook to get current user's ability
 */
export const useAbility = () => {
  const { role } = useUserWithRole();

  return useMemo(() => {
    return defineAbility({ role });
  }, [role]);
};

/**
 * Check if user has permission for an action
 */
export const can = (
  ability: AppAbility,
  action: "create" | "read" | "update" | "delete" | "manage",
  subject: "User" | "Settings" | "all"
): boolean => {
  return ability.can(action, subject);
};

/**
 * Check if user cannot perform an action
 */
export const cannot = (
  ability: AppAbility,
  action: "create" | "read" | "update" | "delete" | "manage",
  subject: "User" | "Settings" | "all"
): boolean => {
  return ability.cannot(action, subject);
};

