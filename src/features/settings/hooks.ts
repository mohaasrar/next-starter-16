"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "./api";
import { SettingsInput } from "./schema";

export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SettingsInput) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};


