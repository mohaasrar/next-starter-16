import { fetcher } from "@/lib/fetcher";

export const settingsApi = {
  get: () => fetcher("/api/settings"),
  update: (data: unknown) =>
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
};


