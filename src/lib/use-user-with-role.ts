"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { createMongoAbility } from "@casl/ability";
import type { AppAbility } from "@/server/auth/casl";

type AbilityResponse = {
  rules: Array<{
    action: string;
    subject: string;
    inverted?: boolean;
    conditions?: any;
  }>;
  role: "user" | "admin" | "super_admin";
  user: {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin" | "super_admin";
  };
};

/**
 * Fetch user abilities from API
 */
async function fetchAbilities(): Promise<AbilityResponse | null> {
  const response = await fetch("/api/abilities");
  if (!response.ok) {
    return null;
  }
  return response.json();
}

/**
 * Hook to get current user with role and abilities from backend
 */
export function useUserWithRole() {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user?.id;

  const { data: abilitiesData, isPending: abilitiesPending } = useQuery({
    queryKey: ["abilities", userId],
    queryFn: fetchAbilities,
    enabled: !!userId,
  });

  const isPending = sessionPending || (!!userId && abilitiesPending);

  // Build ability from backend rules
  const ability = useMemo(() => {
    if (!abilitiesData?.rules) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return createMongoAbility(abilitiesData.rules as any) as any as AppAbility;
    } catch (error) {
      console.error("Error creating ability from rules:", error);
      return null;
    }
  }, [abilitiesData?.rules]) as AppAbility | null;

  return {
    user: abilitiesData?.user || null,
    role: (abilitiesData?.role as "user" | "admin" | "super_admin") || "user",
    ability,
    isPending,
  };
}

