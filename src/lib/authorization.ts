import { type AppAbility } from "@/server/auth/casl";
import { useUserWithRole } from "./use-user-with-role";
import { useMemo } from "react";
import { createMongoAbility } from "@casl/ability";

/**
 * Extended ability type with loading state
 */
export type AbilityWithPending = AppAbility & { isPending: boolean };

/**
 * React hook to get current user's ability from backend
 */
export const useAbility = (): AbilityWithPending => {
  const { ability, isPending } = useUserWithRole();

  // Use ability from backend, or create a default one if not loaded
  const finalAbility = useMemo(() => {
    if (ability) {
      return ability;
    }
    // Default ability for guest/unauthenticated users
    return createMongoAbility([]) as AppAbility;
  }, [ability]);

  // Return ability with isPending flag
  return Object.assign(finalAbility, { isPending }) as AbilityWithPending;
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

