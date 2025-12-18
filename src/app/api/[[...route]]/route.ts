import { Hono } from "hono";
import { handle } from "hono/vercel";
import { usersApi } from "@/server/api/users";
import { settingsApi } from "@/server/api/settings";
import { authUsersApi } from "@/server/api/auth-users";
import { abilitiesApi } from "@/server/api/abilities";
import {
  errorHandlerMiddleware,
  authenticationMiddleware,
  authorizationMiddleware,
} from "@/server/api/middlewares";

import type { Variables } from "@/server/api/types";

const app = new Hono<{ Variables: Variables }>().basePath("/api");

// Global error handler
app.onError(errorHandlerMiddleware);

// Apply authentication middleware to all routes
app.use("/*", authenticationMiddleware);

// Apply authorization middleware to all routes (builds abilities)
app.use("/*", authorizationMiddleware);

app.route("/users", usersApi);
app.route("/auth-users", authUsersApi);
app.route("/settings", settingsApi);
app.route("/abilities", abilitiesApi);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);

