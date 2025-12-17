"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authUsersApi, type AuthUser } from "./api";

export const useAuthUsers = () => {
  return useQuery({
    queryKey: ["auth-users"],
    queryFn: () => authUsersApi.getAll(),
  });
};

export const useCreateAuthUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; role: "user" | "admin" | "super_admin" }) =>
      authUsersApi.create(data),
    onSuccess: async (newUser) => {
      // Optimistically update the cache with the new user
      queryClient.setQueryData<AuthUser[]>(["auth-users"], (old) => {
        if (!old) return [newUser];
        return [newUser, ...old];
      });
      
      // Invalidate and refetch to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey: ["auth-users"], refetchType: "active" });
    },
  });
};

export const useUpdateAuthUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; email: string; role: "user" | "admin" | "super_admin" } }) =>
      authUsersApi.update(id, data),
    onSuccess: async (updatedUser) => {
      // Optimistically update the cache with the new data
      queryClient.setQueryData<AuthUser[]>(["auth-users"], (old) => {
        if (!old) return old;
        return old.map((user) => (user.id === updatedUser.id ? updatedUser : user));
      });
      
      // Invalidate and refetch to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey: ["auth-users"], refetchType: "active" });
      await queryClient.invalidateQueries({ queryKey: ["user-with-role"], refetchType: "active" });
    },
  });
};

