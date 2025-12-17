"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./api";
import { UserInput } from "./schema";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.getAll(),
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserInput) => usersApi.create(data),
    onSuccess: async (newUser) => {
      // Optimistically update the cache with the new user
      queryClient.setQueryData<any[]>(["users"], (old) => {
        if (!old) return [newUser];
        return [newUser, ...old];
      });
      
      // Invalidate and refetch to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey: ["users"], refetchType: "active" });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserInput }) =>
      usersApi.update(id, data),
    onSuccess: async (updatedUser) => {
      // Optimistically update the cache with the new data
      queryClient.setQueryData<any[]>(["users"], (old) => {
        if (!old) return old;
        return old.map((user) => (user.id === updatedUser.id ? updatedUser : user));
      });
      
      // Invalidate and refetch to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey: ["users"], refetchType: "active" });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};


