"use client";

import type { IngredientType } from "@/types/ingredient";
import {
  Dialog,
  DialogContent,
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
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[min(48rem,calc(100vw-3rem))] sm:max-w-3xl max-h-[90vh] overflow-y-auto"
      >
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
