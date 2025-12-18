import { create } from "zustand";

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  okLabel: string;
  onConfirm: () => void;
  variant: "destructive" | "default" | "outline" | "ghost";
  openDialog: (config: {
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "destructive" | "default" | "outline" | "ghost";
    okLabel?: string;
  }) => void;
  closeDialog: () => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set) => ({
  isOpen: false,
  title: "",
  description: "",
  onConfirm: () => {},
  variant: "default",
  okLabel: "Confirm",
  openDialog: ({
    title,
    description,
    onConfirm,
    variant = "default",
    okLabel = "Confirm",
  }) =>
    set({
      isOpen: true,
      title,
      description,
      onConfirm,
      variant,
      okLabel,
    }),
  closeDialog: () => set({ isOpen: false }),
}));

