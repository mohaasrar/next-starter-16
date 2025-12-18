"use client";

import { useState } from "react";
import { useCustomers, useDeleteCustomer } from "@/features/customers/hooks";
import { CustomersTable } from "./customer-table";
import { CustomerForm } from "./customer-form";
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
import { useConfirmDialogStore } from "@/store/confirm-dialog-store";

type Customer = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  isActive: boolean;
  notes: string | null;
  updatedAt: Date | null;
};

export default function CustomersPage() {
  const { data = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const ability = useAbility();
  const [formOpen, setFormOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const canCreate = (ability as any).can("create", "Customer");
  const canUpdate = (ability as any).can("update", "Customer");
  const canDelete = (ability as any).can("delete", "Customer");

  const confirmDialog = useConfirmDialogStore();

  const handleDelete = async (id: number) => {
    confirmDialog.openDialog({
      title: "Delete Customer",
      description: "Are you sure you want to delete this customer? This action cannot be undone.",
      variant: "destructive",
      okLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteCustomer.mutateAsync(id);
          toast.success("Customer deleted successfully");
        } catch (error) {
          toast.error("Failed to delete customer", {
            description: error instanceof Error ? error.message : "An error occurred",
          });
        }
      },
    });
  };

  const handleBulkDelete = async (ids: number[]) => {
    confirmDialog.openDialog({
      title: "Delete Customers",
      description: `Are you sure you want to delete ${ids.length} customer(s)? This action cannot be undone.`,
      variant: "destructive",
      okLabel: "Delete",
      onConfirm: async () => {
        try {
          await Promise.all(ids.map((id) => deleteCustomer.mutateAsync(id)));
          toast.success(`${ids.length} customer(s) deleted successfully`);
        } catch (error) {
          toast.error("Failed to delete customers", {
            description: error instanceof Error ? error.message : "An error occurred",
          });
        }
      },
    });
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditMode(true);
    setFormOpen(true);
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedCustomer(null);
    setIsEditMode(false);
  };

  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setIsEditMode(false);
    setFormOpen(true);
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
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Customers</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your customers and their information
            </p>
          </div>
          {canCreate && (
            <Button 
              onClick={handleNewCustomer} 
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
              New Customer
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <CustomersTable 
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
        setFormOpen(open);
        if (!open) {
          setSelectedCustomer(null);
          setIsEditMode(false);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Customer" : "Create New Customer"}</SheetTitle>
            <SheetDescription>
              {isEditMode 
                ? "Update customer information. Modify the fields as needed."
                : "Add a new customer to the system. Fill in all required fields."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <CustomerForm 
              key={selectedCustomer?.id || "new"} 
              customer={selectedCustomer} 
              onSuccess={handleFormSuccess} 
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View detailed information about this customer.
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm mt-1">{selectedCustomer.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm mt-1">{selectedCustomer.email || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-sm mt-1">{selectedCustomer.phone || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="text-sm mt-1">{selectedCustomer.address || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">City</label>
                <p className="text-sm mt-1">{selectedCustomer.city || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Country</label>
                <p className="text-sm mt-1">{selectedCustomer.country || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Postal Code</label>
                <p className="text-sm mt-1">{selectedCustomer.postalCode || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Is Active</label>
                <p className="text-sm mt-1">{selectedCustomer.isActive ? "Yes" : "No"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-sm mt-1">{selectedCustomer.notes}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                <p className="text-sm mt-1">{selectedCustomer.updatedAt ? new Date(selectedCustomer.updatedAt).toLocaleString() : "N/A"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
