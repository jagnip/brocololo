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

type EditIngredientDialogProps = IngredientFormDependencies & {
  open: boolean;
  ingredient?: IngredientType;
  onOpenChange: (open: boolean) => void;
  onUpdated: (ingredient: IngredientType) => void;
};

export function EditIngredientDialog({
  open,
  ingredient,
  onOpenChange,
  onUpdated,
  categories,
  units,
  gramsUnitId,
  iconOptions,
}: EditIngredientDialogProps) {
  if (!ingredient) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit ingredient</DialogTitle>
          <DialogDescription>
            Update the selected ingredient without leaving recipe editing.
          </DialogDescription>
        </DialogHeader>

        <IngredientForm
          mode="dialog"
          ingredient={ingredient}
          categories={categories}
          units={units}
          gramsUnitId={gramsUnitId}
          iconOptions={iconOptions}
          onSubmitted={(updatedIngredient) => {
            onUpdated(updatedIngredient);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
