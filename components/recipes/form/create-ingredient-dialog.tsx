"use client";

import type { IngredientType } from "@/types/ingredient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import IngredientForm from "@/components/ingredients/form/ingredient-form";

type IngredientFormDependencies = {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; namePlural: string | null }>;
  gramsUnitId: string;
  iconOptions: string[];
};

type CreateIngredientDialogProps = IngredientFormDependencies & {
  open: boolean;
  initialName?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (ingredient: IngredientType) => void;
};

export function CreateIngredientDialog({
  open,
  initialName,
  onOpenChange,
  onCreated,
  categories,
  units,
  gramsUnitId,
  iconOptions,
}: CreateIngredientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create ingredient</DialogTitle>
          <DialogDescription>
            {/* Reused across recipe and log contexts, so keep copy flow-agnostic. */}
            Add a missing ingredient without leaving your current flow.
          </DialogDescription>
        </DialogHeader>

        <IngredientForm
          mode="dialog"
          initialName={initialName}
          categories={categories}
          units={units}
          gramsUnitId={gramsUnitId}
          iconOptions={iconOptions}
          onSubmitted={(ingredient) => {
            onCreated(ingredient);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
