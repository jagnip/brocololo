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

type CreateIngredientDialogProps = IngredientFormDependencies & {
  open: boolean;
  initialName?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (ingredient: IngredientType) => void;
  isAdmin?: boolean;
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
  isAdmin = false,
}: CreateIngredientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Title lives inside IngredientForm (dialog mode) — same as EditIngredientDialog. */}
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[min(48rem,calc(100vw-3rem))] sm:max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <IngredientForm
          mode="dialog"
          initialName={initialName}
          isAdmin={isAdmin}
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
