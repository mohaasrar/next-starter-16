"use client";

import { useState } from "react";
import { useUsers, useDeleteUser } from "@/features/users/hooks";
import { UsersTable } from "@/components/tables/users-table";
import { UserForm } from "@/features/users/components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAbility } from "@/lib/authorization";

type User = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin" | null;
  createdAt: Date | null;
};

export default function UsersPage() {
  const { data = [], isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const ability = useAbility();
  const [formOpen, setFormOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const canCreate = ability.can("create", "User");
  const canUpdate = ability.can("update", "User");
  const canDelete = ability.can("delete", "User");

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser.mutateAsync(id);
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error("Failed to delete user", {
          description: error instanceof Error ? error.message : "An error occurred",
        });
      }
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => deleteUser.mutateAsync(id)));
      toast.success(`${ids.length} user(s) deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete users", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleEdit = (user: User) => {
    console.log("handleEdit called with user:", user);
    setSelectedUser(user);
    setIsEditMode(true);
    setFormOpen(true);
    console.log("formOpen should be true now");
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedUser(null);
    setIsEditMode(false);
  };

  const handleNewUser = () => {
    console.log("handleNewUser called");
    setSelectedUser(null);
    setIsEditMode(false);
    setFormOpen(true);
    console.log("formOpen should be true now");
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your users and their permissions
            </p>
          </div>
          {canCreate && (
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
          )}
        </div>

        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <UsersTable 
                data={data} 
                onDelete={canDelete ? handleDelete : undefined}
                onEdit={canUpdate ? handleEdit : undefined}
                onView={handleView}
                onBulkDelete={canDelete ? handleBulkDelete : undefined}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={formOpen} onOpenChange={(open) => {
        console.log("Sheet onOpenChange called with:", open);
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
                : "Add a new user to the system. Fill in all required fields."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <UserForm 
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
                <p className="text-sm mt-1">{selectedUser.id}</p>
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
                <p className="text-sm mt-1 capitalize">{selectedUser.role || "user"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-sm mt-1">
                  {selectedUser.createdAt 
                    ? new Date(selectedUser.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
