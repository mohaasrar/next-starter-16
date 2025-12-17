import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SidebarProvider } from "@/components/sidebar-provider";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <aside className="hidden md:block transition-all duration-300">
          <AppSidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 sm:p-6 md:p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
