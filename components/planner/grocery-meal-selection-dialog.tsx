"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckboxWithLabel } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GroceryGenerationExclusions } from "@/lib/groceries/generation-options";
import {
  exclusionsFromSelectedMealKeys,
  groceryMealOptionKey,
  type GroceryMealOption,
} from "@/lib/groceries/generation-options";

type GroceryMealSelectionDialogProps = {
  open: boolean;
  meals: GroceryMealOption[];
  isLoading: boolean;
  isGenerating: boolean;
  onConfirm: (exclusions: GroceryGenerationExclusions) => void;
  onCancel: () => void;
};

export function GroceryMealSelectionDialog({
  open,
  meals,
  isLoading,
  isGenerating,
  onConfirm,
  onCancel,
}: GroceryMealSelectionDialogProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Reset to all meals selected whenever the dialog opens with fresh meal data.
  useEffect(() => {
    if (!open || isLoading) return;
    setSelectedKeys(new Set(meals.map(groceryMealOptionKey)));
  }, [open, isLoading, meals]);

  const hasSelection = selectedKeys.size > 0;

  function toggleMeal(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(exclusionsFromSelectedMealKeys(meals, selectedKeys));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isGenerating) {
          onCancel();
        }
      }}
    >
      <DialogContent className="flex max-h-[min(32rem,85vh)] flex-col gap-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meals to shop for</DialogTitle>
          <DialogDescription>
            Checked meals will be included in your grocery list.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading meals…
            </div>
          ) : meals.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No meals with ingredients found on this plan. Add recipes or
              custom meals with ingredients first.
            </p>
          ) : (
            <ul className="space-y-3">
              {meals.map((meal) => {
                const key = groceryMealOptionKey(meal);

                return (
                  <li key={key}>
                    <CheckboxWithLabel
                      checked={selectedKeys.has(key)}
                      disabled={isGenerating}
                      onCheckedChange={(checked) =>
                        toggleMeal(key, checked === true)
                      }
                      label={meal.name}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || meals.length === 0 || !hasSelection || isGenerating}
            aria-busy={isGenerating}
          >
            {isGenerating ? "Generating…" : "Generate list"}
          </Button>
        </DialogFooter>

        {!hasSelection && meals.length > 0 && !isLoading ? (
          <p className="text-center text-xs text-muted-foreground">
            Select at least one meal to generate a grocery list.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
