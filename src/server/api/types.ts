import type { AppAbility } from "@/server/auth/casl";
import type { User, Session } from "better-auth/types";

export interface Variables {
  user: User | null;
  session: Session | null;
  ability?: AppAbility;
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: string; // Role name (e.g., "user", "admin", "super_admin")
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

