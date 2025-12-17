import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";

export type User = {
  role: "user" | "admin" | "super_admin";
};

export type Actions = "create" | "read" | "update" | "delete" | "manage";
export type Subjects = "User" | "Settings" | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbility(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  const role = user.role || "user";

  // Super Admin - Full access to everything
  if (role === "super_admin") {
    can("manage", "all");
    return build();
  }

  // Admin - Can manage users and settings
  if (role === "admin") {
    can("manage", "User");
    can("read", "Settings");
    can("update", "Settings");
    return build();
  }

  // User - Limited access
  can("read", "User");
  can("read", "Settings");
  cannot("create", "User");
  cannot("update", "User");
  cannot("delete", "User");
  cannot("update", "Settings");

  return build();
}


