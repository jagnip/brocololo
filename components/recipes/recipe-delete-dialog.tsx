"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteRecipeAction } from "@/actions/recipe-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RecipeDeleteDialogProps = {
  recipeId: string;
  recipeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RecipeDeleteDialog({
  recipeId,
  recipeName,
  open,
  onOpenChange,
}: RecipeDeleteDialogProps) {
  const [isDeleting, startDeleteTransition] = useTransition();

  function onConfirmDelete() {
    startDeleteTransition(async () => {
      const result = await deleteRecipeAction(recipeId);

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
          <DialogTitle>Delete recipe?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{recipeName}</strong>? This
            action cannot be undone.
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
