"use client";

import { useState } from "react";
import { useAuthUsers } from "@/features/auth-users/hooks";
import { AuthUsersTable } from "@/components/tables/auth-users-table";
import { AuthUserForm } from "@/features/auth-users/components";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { useAbility } from "@/lib/authorization";
import { Button } from "@/components/ui/button";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin" | "super_admin";
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function AuthUsersPage() {
  const { data = [], isLoading } = useAuthUsers();
  const ability = useAbility();
  const [formOpen, setFormOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const canCreate = ability.can("create", "User");
  const canUpdate = ability.can("update", "User");

  // Redirect if user doesn't have permission to view this page
  // Auth Users page requires create permission (admin/super_admin only)
  if (!canCreate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view this page. This page is only available to administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleEdit = (user: AuthUser) => {
    console.log("handleEdit called with user (auth-users):", user);
    setSelectedUser(user);
    setIsEditMode(true);
    setFormOpen(true);
    console.log("formOpen should be true now");
  };

  const handleView = (user: AuthUser) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleNewUser = () => {
    console.log("handleNewUser called (auth-users)");
    setSelectedUser(null);
    setIsEditMode(false);
    setFormOpen(true);
    console.log("formOpen should be true now");
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedUser(null);
    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Auth Users</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage Better Auth users and their roles
            </p>
          </div>
          <div className="flex items-center gap-2">
            {formOpen && <span className="text-sm text-muted-foreground">Form is open</span>}
            <Button 
              onClick={handleNewUser} 
              variant="default"
              style={{ 
                backgroundColor: 'hsl(var(--primary))', 
                color: 'hsl(var(--primary-foreground))' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New User
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <AuthUsersTable 
                data={data} 
                onEdit={handleEdit}
                onView={handleView}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={formOpen} onOpenChange={(open) => {
        console.log("Sheet onOpenChange called with (auth-users):", open);
        setFormOpen(open);
        if (!open) {
          setSelectedUser(null);
          setIsEditMode(false);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit User" : "Create New User"}</SheetTitle>
            <SheetDescription>
              {isEditMode 
                ? "Update user information. Modify the fields as needed."
                : "Add a new Better Auth user to the system. Fill in all required fields."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <AuthUserForm 
              key={selectedUser?.id || "new"} 
              user={selectedUser} 
              onSuccess={handleFormSuccess} 
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm mt-1 font-mono">{selectedUser.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm mt-1">{selectedUser.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm mt-1">{selectedUser.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-sm mt-1 capitalize">
                  {selectedUser.role === "super_admin" ? "Super Admin" : selectedUser.role}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
                <p className="text-sm mt-1">{selectedUser.emailVerified ? "Yes" : "No"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm mt-1">
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                <p className="text-sm mt-1">
                  {new Date(selectedUser.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

