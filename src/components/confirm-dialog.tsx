"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConfirmDialogStore } from "@/store/confirm-dialog-store";
import { buttonVariants } from "./ui/button";

export function ConfirmDialog() {
  const {
    isOpen,
    title,
    description,
    variant,
    okLabel,
    onConfirm,
    closeDialog,
  } = useConfirmDialogStore();

  const handleConfirm = () => {
    onConfirm();
    closeDialog();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={closeDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={buttonVariants({ variant })}
          >
            {okLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

