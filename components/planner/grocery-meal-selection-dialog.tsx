"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
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
  const selectionId = useId();

  // Fresh meals start selected; rolled-over/cooked quantities require opt-in.
  useEffect(() => {
    if (!open || isLoading) return;
    setSelectedKeys(new Set(meals
      .filter((meal) => meal.kind !== "recipe" || !meal.alreadyAvailable)
      .map(groceryMealOptionKey)));
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
      <DialogContent aria-describedby={undefined} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-12 text-left sm:p-6">
          <DialogTitle>Meals to shop for</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable] sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading meals…
            </div>
          ) : meals.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No ingredients to buy. Add meals with ingredients to this plan.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {meals.map((meal) => {
                const key = groceryMealOptionKey(meal);
                const checkboxId = `${selectionId}-${key}`;
                const selected = selectedKeys.has(key);
                const status = meal.kind === "recipe" && meal.alreadyAvailable
                  ? meal.alreadyCooked ? "Already cooked" : "Rolled over"
                  : null;
                const quantities = [
                  `${meal.occurrenceCount} ${meal.occurrenceCount === 1 ? "meal" : "meals"}`,
                  ...(meal.kind === "recipe" && (meal.storageCount ?? 0) > 0 ? [`${meal.storageCount} in storage`] : []),
                ].join(" \u00b7 ");
                const details = status ? `${quantities} \u00b7 ${status}` : quantities;

                return (
                  <li key={key} className="min-w-0">
                    <Card
                      data-selected={selected}
                      className={cn(
                        "h-full gap-0 overflow-hidden rounded-md py-0 shadow-none transition-colors hover:bg-muted/40 focus-within:bg-muted/40",
                        selected && "border-ring",
                        isGenerating && "pointer-events-none opacity-50",
                      )}
                    >
                      <Label
                        htmlFor={checkboxId}
                        className="flex h-full min-w-0 cursor-pointer items-start gap-3 p-4 font-normal normal-case tracking-normal text-foreground"
                      >
                        <Checkbox
                          id={checkboxId}
                          aria-label={`${meal.name} \u00b7 ${details}`}
                          className="mt-0.5 size-5 shrink-0"
                          checked={selected}
                          disabled={isGenerating}
                          onCheckedChange={(checked) => toggleMeal(key, checked === true)}
                        />
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0 flex-1 break-words type-body font-medium">{meal.name}</span>
                            {status ? <Badge variant="secondary" className="shrink-0 text-muted-foreground">{status}</Badge> : null}
                          </span>
                          <span className="block type-caption tabular-nums text-muted-foreground">{quantities}</span>
                        </span>
                      </Label>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t p-4 sm:gap-2 sm:p-6">
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
          <p className="shrink-0 px-4 pb-4 text-center text-xs text-muted-foreground sm:px-6">
            Select at least one meal to generate a grocery list.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
