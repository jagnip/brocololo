"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { ingredientsToSearchableSelectOptions } from "@/components/ingredients/ingredient-searchable-select-labels";
import { NutritionPersonCard } from "@/components/recipes/nutrition-person-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import type {
  GroceriesEditIngredientOption,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";
import {
  EMPTY_QUICK_ADD_DRAFT,
  type QuickAddDraft,
} from "@/lib/groceries/groceries-add-ingredient";
import { getQuickAddDraftForIngredient } from "@/lib/groceries/grocery-row-ingredient-patch";
import { focusVisibleAmountInputInContainer } from "@/lib/focus-input-after-layout";
import { getUnitDisplayName } from "@/lib/recipes/helpers";

type GroceriesEditQuickAddSectionProps = {
  ingredients: GroceriesEditIngredientOption[];
  ingredientById: Map<string, GroceriesEditIngredientOption>;
  unitById: Map<string, GroceriesEditUnitOption>;
  renderIngredientDropdownLabel: (option: SearchableSelectOption) => React.ReactNode;
  renderIngredientTriggerLabel: (option: SearchableSelectOption) => React.ReactNode;
  onAddItem: (draft: QuickAddDraft) => boolean;
  onEditIngredientRequested: (ingredientId: string) => void;
};

// Hint shown when search has no DB match — free-text still lives in per-category "Add item".
const QUICK_ADD_EMPTY_LABEL =
  "No ingredient found. Use Add item in a category below for custom items.";

export function GroceriesEditQuickAddSection({
  ingredients,
  ingredientById,
  unitById,
  renderIngredientDropdownLabel,
  renderIngredientTriggerLabel,
  onAddItem,
  onEditIngredientRequested,
}: GroceriesEditQuickAddSectionProps) {
  const [draft, setDraft] = useState<QuickAddDraft>(EMPTY_QUICK_ADD_DRAFT);
  const sectionRef = useRef<HTMLElement>(null);

  const ingredientSearchOptions = useMemo<SearchableSelectOption[]>(
    () =>
      ingredientsToSearchableSelectOptions(
        ingredients.map((ingredient) => ({
          id: ingredient.id,
          slug: ingredient.slug,
          name: ingredient.name,
          brand: ingredient.brand,
          descriptor: ingredient.descriptor,
          icon: ingredient.icon,
          category: ingredient.category,
        })),
      ),
    [ingredients],
  );

  const selectedIngredient = draft.ingredientId
    ? ingredientById.get(draft.ingredientId) ?? null
    : null;
  const availableUnits = useMemo(
    () => selectedIngredient?.unitConversions ?? [],
    [selectedIngredient],
  );

  const handleIngredientChange = useCallback(
    (nextIngredientId: string | null) => {
      if (!nextIngredientId) {
        setDraft(EMPTY_QUICK_ADD_DRAFT);
        return;
      }

      const nextIngredient = ingredientById.get(nextIngredientId);
      if (!nextIngredient) return;

      setDraft(getQuickAddDraftForIngredient(nextIngredient));
    },
    [ingredientById],
  );

  // After ingredient select, focus amount so the user can type immediately.
  useEffect(() => {
    if (!draft.ingredientId) return;
    focusVisibleAmountInputInContainer(sectionRef.current);
  }, [draft.ingredientId]);

  const handleAddItem = useCallback(() => {
    if (!draft.ingredientId) return;
    const added = onAddItem(draft);
    if (added) {
      setDraft(EMPTY_QUICK_ADD_DRAFT);
    }
  }, [draft, onAddItem]);

  const amountValue = draft.amount === null ? "" : String(draft.amount);
  const fieldsDisabled = !selectedIngredient;

  const addItemButton = (
    <Button
      type="button"
      variant="outline"
      disabled={fieldsDisabled}
      onClick={handleAddItem}
      className="shrink-0"
    >
      Add item
    </Button>
  );

  return (
    <section
      ref={sectionRef}
      aria-label="Quick add ingredients"
      className="scroll-mt-28 space-y-3"
    >
      <NutritionPersonCard variant="spotlight">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Quick add</h2>
            {addItemButton}
          </div>

          {/* Mobile/tablet: stacked layout mirrors category row xl:hidden block. */}
          <div className="space-y-2 xl:hidden">
            <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_7rem_10rem_auto]">
              <SearchableSelect
                className="min-w-0 w-full font-normal"
                options={ingredientSearchOptions}
                renderLabel={renderIngredientDropdownLabel}
                renderTriggerLabel={renderIngredientTriggerLabel}
                value={draft.ingredientId}
                onValueChange={handleIngredientChange}
                placeholder="Search ingredients..."
                searchPlaceholder="Search ingredients..."
                emptyLabel={QUICK_ADD_EMPTY_LABEL}
              />

              <Input
                key={`quick-add-amount-${draft.ingredientId ?? "none"}`}
                data-grocery-amount-input
                type="number"
                min={0}
                step="any"
                value={amountValue}
                placeholder="Amount"
                disabled={fieldsDisabled}
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  setDraft((prev) => {
                    if (nextValue === "") return { ...prev, amount: null };
                    const parsed = Number(nextValue);
                    if (Number.isNaN(parsed)) return prev;
                    return { ...prev, amount: parsed };
                  });
                }}
              />

              <Select
                value={draft.unitId ?? ""}
                onValueChange={(nextUnitId) =>
                  setDraft((prev) => ({ ...prev, unitId: nextUnitId || null }))
                }
                disabled={fieldsDisabled || availableUnits.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map((conversion) => {
                    const unit = unitById.get(conversion.unitId);
                    if (!unit) return null;
                    return (
                      <SelectItem key={conversion.unitId} value={conversion.unitId}>
                        {getUnitDisplayName({
                          amount: draft.amount,
                          unitName: unit.name,
                          unitNamePlural: unit.namePlural,
                        })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={fieldsDisabled}
                aria-label={
                  selectedIngredient
                    ? `Edit ${selectedIngredient.name}`
                    : "Edit ingredient"
                }
                onClick={() => {
                  if (!selectedIngredient) return;
                  onEditIngredientRequested(selectedIngredient.id);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <Input
                value={draft.additionalInfo ?? ""}
                disabled={fieldsDisabled}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    additionalInfo: event.target.value || null,
                  }))
                }
                placeholder="Enter additional info"
              />

              <Input
                value={draft.substitutionNote ?? ""}
                disabled={fieldsDisabled}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    substitutionNote: event.target.value || null,
                  }))
                }
                placeholder="Enter substitutions"
              />
            </div>
          </div>

          {/* Desktop: single horizontal row mirrors category row xl:grid block. */}
          <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.3fr)_7rem_10rem_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-start xl:gap-2">
            <SearchableSelect
              className="min-w-0 w-full font-normal"
              options={ingredientSearchOptions}
              renderLabel={renderIngredientDropdownLabel}
              renderTriggerLabel={renderIngredientTriggerLabel}
              value={draft.ingredientId}
              onValueChange={handleIngredientChange}
              placeholder="Search ingredients..."
              searchPlaceholder="Search ingredients..."
              emptyLabel={QUICK_ADD_EMPTY_LABEL}
            />

            <Input
              key={`quick-add-amount-desktop-${draft.ingredientId ?? "none"}`}
              data-grocery-amount-input
              type="number"
              min={0}
              step="any"
              value={amountValue}
              placeholder="Amount"
              disabled={fieldsDisabled}
              onChange={(event) => {
                const nextValue = event.target.value.trim();
                setDraft((prev) => {
                  if (nextValue === "") return { ...prev, amount: null };
                  const parsed = Number(nextValue);
                  if (Number.isNaN(parsed)) return prev;
                  return { ...prev, amount: parsed };
                });
              }}
            />

            <Select
              value={draft.unitId ?? ""}
              onValueChange={(nextUnitId) =>
                setDraft((prev) => ({ ...prev, unitId: nextUnitId || null }))
              }
              disabled={fieldsDisabled || availableUnits.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((conversion) => {
                  const unit = unitById.get(conversion.unitId);
                  if (!unit) return null;
                  return (
                    <SelectItem key={conversion.unitId} value={conversion.unitId}>
                      {getUnitDisplayName({
                        amount: draft.amount,
                        unitName: unit.name,
                        unitNamePlural: unit.namePlural,
                      })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Input
              value={draft.additionalInfo ?? ""}
              disabled={fieldsDisabled}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  additionalInfo: event.target.value || null,
                }))
              }
              placeholder="Enter additional info"
            />

            <Input
              value={draft.substitutionNote ?? ""}
              disabled={fieldsDisabled}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  substitutionNote: event.target.value || null,
                }))
              }
              placeholder="Enter substitutions"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={fieldsDisabled}
              aria-label={
                selectedIngredient
                  ? `Edit ${selectedIngredient.name}`
                  : "Edit ingredient"
              }
              onClick={() => {
                if (!selectedIngredient) return;
                onEditIngredientRequested(selectedIngredient.id);
              }}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </NutritionPersonCard>
    </section>
  );
}
