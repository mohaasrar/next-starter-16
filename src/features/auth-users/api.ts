import { fetcher } from "@/lib/fetcher";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin" | "super_admin";
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const authUsersApi = {
  getAll: (): Promise<AuthUser[]> => fetcher("/api/auth-users"),
  create: (data: { name: string; email: string; role: "user" | "admin" | "super_admin" }) =>
    fetch("/api/auth-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  update: (id: string, data: { name: string; email: string; role: "user" | "admin" | "super_admin" }) =>
    fetch(`/api/auth-users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
};

