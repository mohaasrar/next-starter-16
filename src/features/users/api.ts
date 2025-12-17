import { fetcher } from "@/lib/fetcher";

export const usersApi = {
  getAll: () => fetcher("/api/users"),
  create: (data: unknown) =>
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  update: (id: number, data: unknown) =>
    fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  delete: (id: number) =>
    fetch(`/api/users/${id}`, {
      method: "DELETE",
    }).then((r) => r.json()),
};


