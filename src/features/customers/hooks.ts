"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "./api";
import { CustomerInput } from "./schema";

export const useCustomers = () => {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.getAll(),
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomerInput) => customersApi.create(data),
    onSuccess: async (newCustomer) => {
      // Optimistically update the cache for immediate UI feedback
      queryClient.setQueryData<any[]>(["customers"], (old) => {
        if (!old) return [newCustomer];
        return [newCustomer, ...old];
      });
      // Invalidate and refetch to ensure we have the latest data from server
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      // Force refetch to update the UI
      await queryClient.refetchQueries({ queryKey: ["customers"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerInput }) =>
      customersApi.update(id, data),
    onSuccess: async (updatedCustomer) => {
      // Optimistically update the cache for immediate UI feedback
      queryClient.setQueryData<any[]>(["customers"], (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === updatedCustomer.id ? updatedCustomer : item));
      });
      // Invalidate and refetch to ensure we have the latest data from server
      await queryClient.invalidateQueries({ queryKey: ["customers"], refetchType: "active" });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: async () => {
      // Invalidate and refetch to ensure we have the latest data from server
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      // Force refetch to update the UI
      await queryClient.refetchQueries({ queryKey: ["customers"] });
    },
  });
};
