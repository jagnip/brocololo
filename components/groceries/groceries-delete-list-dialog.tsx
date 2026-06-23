"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteShoppingListAction } from "@/actions/shopping-list-actions";
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
import { ROUTES } from "@/lib/constants";

type GroceriesDeleteListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  onDeletingChange?: (isDeleting: boolean) => void;
};

/** Confirms removal of the entire grocery list for a meal plan. */
export function GroceriesDeleteListDialog({
  open,
  onOpenChange,
  planId,
  onDeletingChange,
}: GroceriesDeleteListDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      onDeletingChange?.(true);
      const result = await deleteShoppingListAction({ planId });
      onDeletingChange?.(false);
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("Grocery list deleted.");
      onOpenChange(false);
      router.push(ROUTES.groceriesView(planId));
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete groceries list?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the grocery list for this meal plan. You can generate a
            new list from the meal plan at any time. Any active share links will
            stop working.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete list"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
