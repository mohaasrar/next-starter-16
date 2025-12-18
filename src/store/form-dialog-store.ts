import { create } from "zustand";

// Define a generic store type for form dialogs
type FormDialogState<T = any> = {
  open: string | null;
  selectedRow: T | null;
  setOpenFormDialog: (open: string | null, row?: T | null) => void;
};

// Create the store with a generic type
export const useFormDialogStore = create<FormDialogState>((set) => ({
  open: null,
  selectedRow: null,
  setOpenFormDialog: (open, row = null) =>
    set({ open, selectedRow: open ? row : null }),
}));

