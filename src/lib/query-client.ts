import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

/**
 * Get or create a QueryClient instance
 * Uses React cache to ensure the same instance is used across the app
 */
const getQueryClient = cache(() => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  });
});

export default getQueryClient;

// Export a singleton instance for use outside of React components
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

