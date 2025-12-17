import { Hono } from "hono";
import { handle } from "hono/vercel";
import { usersApi } from "@/server/api/users";
import { settingsApi } from "@/server/api/settings";
import { authUsersApi } from "@/server/api/auth-users";

const app = new Hono().basePath("/api");

app.route("/users", usersApi);
app.route("/auth-users", authUsersApi);
app.route("/settings", settingsApi);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);

