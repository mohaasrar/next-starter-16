"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Settings,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "./sidebar-provider";
import { useAbility } from "@/lib/authorization";

type NavigationItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: { action: "read" | "create" | "update" | "delete" | "manage"; subject: "User" | "Settings" | "all" } | null;
};

const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: null, // Always visible
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
    permission: { action: "read", subject: "User" },
  },
  {
    title: "Auth Users",
    href: "/dashboard/auth-users",
    icon: UserCog,
    // Only show to users who can create users (admin/super_admin)
    permission: { action: "create", subject: "User" },
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    // Only show to users who can update settings (admin/super_admin)
    permission: { action: "update", subject: "Settings" },
  },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export const AppSidebar = ({ onNavigate }: AppSidebarProps) => {
  const pathname = usePathname();
  const { isOpen } = useSidebar();
  const ability = useAbility();

  const handleClick = () => {
    onNavigate?.();
  };

  if (!isOpen) {
    return null;
  }

  // Filter navigation items based on permissions
  // While loading, only show items that don't require permissions (like Dashboard)
  // This prevents showing unauthorized items that will disappear after load
  const visibleNavigation = navigation.filter((item) => {
    if (!item.permission) return true; // Always visible (e.g., Dashboard)
    // While loading, hide items that require permissions to prevent flash
    if (ability.isPending) return false;
    return ability.can(item.permission.action, item.permission.subject);
  });

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar transition-all duration-300">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={handleClick}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">Acme Inc</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-4">
          {visibleNavigation.map((item) => {
            // More precise active state matching
            // For dashboard, only match exact path
            // For other routes, match exact or sub-paths
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
            <span className="text-xs font-medium">AD</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">Admin User</span>
            <span className="text-xs text-sidebar-foreground/70 truncate">admin@example.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};
