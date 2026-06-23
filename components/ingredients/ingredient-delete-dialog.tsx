"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteIngredientAction } from "@/actions/ingredient-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type IngredientDeleteDialogProps = {
  ingredientId: string;
  ingredientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Shared confirmation dialog for deleting an ingredient from the list row.
export function IngredientDeleteDialog({
  ingredientId,
  ingredientName,
  open,
  onOpenChange,
}: IngredientDeleteDialogProps) {
  const [isDeleting, startDeleteTransition] = useTransition();

  function onConfirmDelete() {
    startDeleteTransition(async () => {
      const result = await deleteIngredientAction(ingredientId);

      // Action redirects on success, so only show errors here.
      if (result?.type === "error") {
        toast.error(result.message);
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete ingredient?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{ingredientName}</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirmDelete}
          >
            {isDeleting ? "Deleting..." : "Yes, delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
