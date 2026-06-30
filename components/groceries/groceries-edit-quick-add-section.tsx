"use client";

import type { KeyboardEvent } from "react";
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
  GroceriesEditIngredientRequestContext,
  GroceriesEditUnitOption,
} from "@/components/groceries/groceries-edit-types";
import {
  EMPTY_QUICK_ADD_DRAFT,
  type QuickAddDraft,
} from "@/lib/groceries/groceries-add-ingredient";
import { getQuickAddDraftForIngredient } from "@/lib/groceries/grocery-row-ingredient-patch";
import { resolveUnitForConversion } from "@/lib/groceries/resolve-unit-for-conversion";
import {
  focusQuickAddAdditionalInfoInput,
  focusQuickAddIngredientSelector,
  focusVisibleAmountInputInContainer,
} from "@/lib/focus-input-after-layout";
import { getUnitDisplayName } from "@/lib/recipes/helpers";
import { useIsXl } from "@/hooks/use-is-xl";
import { useSelectOpenOnTabFromAdjacent, markUnitSelectOpenOnAmountTab } from "@/lib/use-select-open-on-focus";

type GroceriesEditQuickAddSectionProps = {
  ingredients: GroceriesEditIngredientOption[];
  ingredientById: Map<string, GroceriesEditIngredientOption>;
  unitById: Map<string, GroceriesEditUnitOption>;
  renderIngredientDropdownLabel: (option: SearchableSelectOption) => React.ReactNode;
  renderIngredientTriggerLabel: (option: SearchableSelectOption) => React.ReactNode;
  onAddItem: (draft: QuickAddDraft) => boolean;
  onEditIngredientRequested: (
    ingredientId: string,
    context?: GroceriesEditIngredientRequestContext,
  ) => void;
  /** Set by parent after ingredient edit saves a new unit from quick-add. */
  preferredUnitId?: string | null;
  onPreferredUnitIdApplied?: () => void;
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
  preferredUnitId,
  onPreferredUnitIdApplied,
}: GroceriesEditQuickAddSectionProps) {
  const [draft, setDraft] = useState<QuickAddDraft>(EMPTY_QUICK_ADD_DRAFT);
  const sectionRef = useRef<HTMLElement>(null);
  // Set when user picks a unit; consumed in Select onCloseAutoFocus (after Radix closes).
  const pendingFocusAdditionalInfoRef = useRef(false);

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

  // Parent sets this after saving a new unit from the quick-add edit dialog.
  useEffect(() => {
    if (!preferredUnitId) return;
    setDraft((prev) => ({ ...prev, unitId: preferredUnitId }));
    onPreferredUnitIdApplied?.();
  }, [preferredUnitId, onPreferredUnitIdApplied]);

  const amountValue = draft.amount === null ? "" : String(draft.amount);
  const fieldsDisabled = !selectedIngredient;
  const unitSelectDisabled = fieldsDisabled || availableUnits.length === 0;
  const isXl = useIsXl();
  const unitSelectFocus = useSelectOpenOnTabFromAdjacent({
    disabled: unitSelectDisabled,
    resetKey: draft.ingredientId,
  });

  const handleUnitChange = useCallback(
    (nextUnitId: string) => {
      const normalized = nextUnitId || null;
      if (normalized) {
        pendingFocusAdditionalInfoRef.current = true;
      }
      unitSelectFocus.clearTabOpenIntent();
      setDraft((prev) => ({ ...prev, unitId: normalized }));
    },
    [unitSelectFocus],
  );

  // Radix returns focus to the unit trigger on close — override only after a real selection.
  const handleUnitSelectCloseAutoFocus = useCallback((event: Event) => {
    if (!pendingFocusAdditionalInfoRef.current) return;
    pendingFocusAdditionalInfoRef.current = false;
    event.preventDefault();
    focusQuickAddAdditionalInfoInput(sectionRef.current);
  }, []);

  const handleAddItem = useCallback(() => {
    if (!draft.ingredientId) return;
    const added = onAddItem(draft);
    if (added) {
      setDraft(EMPTY_QUICK_ADD_DRAFT);
      focusQuickAddIngredientSelector(sectionRef.current);
    }
  }, [draft, onAddItem]);

  // Amount + note fields: Enter commits the row (unit select keeps native open behavior).
  const handleCommitFieldKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleAddItem();
    },
    [handleAddItem],
  );

  const handleAmountKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (markUnitSelectOpenOnAmountTab(event)) {
        unitSelectFocus.markOpenOnTabFromAdjacent();
      }
      handleCommitFieldKeyDown(event);
    },
    [handleCommitFieldKeyDown, unitSelectFocus],
  );

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
              <div data-quick-add-ingredient-select className="min-w-0 w-full">
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
              </div>

              <Input
                key={`quick-add-amount-${draft.ingredientId ?? "none"}`}
                data-grocery-amount-input
                type="number"
                min={0}
                step="any"
                value={amountValue}
                placeholder="Amount"
                disabled={fieldsDisabled}
                onKeyDown={handleAmountKeyDown}
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
                onValueChange={handleUnitChange}
                // Only the visible layout may be open — both Selects share state but both mount in the DOM.
                open={unitSelectFocus.open && !isXl}
                onOpenChange={unitSelectFocus.onOpenChange}
                disabled={unitSelectDisabled}
              >
                <SelectTrigger
                  className="w-full"
                  onFocus={unitSelectFocus.handleTriggerFocus}
                >
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent onCloseAutoFocus={handleUnitSelectCloseAutoFocus}>
                  {availableUnits.map((conversion) => {
                    // Prefer conversion.unit so units added via ingredient edit appear immediately.
                    const unit = resolveUnitForConversion(conversion, unitById);
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
                  onEditIngredientRequested(selectedIngredient.id, { source: "quick-add" });
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <Input
                data-quick-add-additional-info
                value={draft.additionalInfo ?? ""}
                disabled={fieldsDisabled}
                onKeyDown={handleCommitFieldKeyDown}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    additionalInfo: event.target.value || null,
                  }))
                }
                placeholder="Additional info"
              />

              <Input
                value={draft.substitutionNote ?? ""}
                disabled={fieldsDisabled}
                onKeyDown={handleCommitFieldKeyDown}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    substitutionNote: event.target.value || null,
                  }))
                }
                placeholder="Substitutions"
              />
            </div>
          </div>

          {/* Desktop: single horizontal row mirrors category row xl:grid block. */}
          <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.3fr)_7rem_10rem_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-start xl:gap-2">
            <div data-quick-add-ingredient-select className="min-w-0 w-full">
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
            </div>

            <Input
              key={`quick-add-amount-desktop-${draft.ingredientId ?? "none"}`}
              data-grocery-amount-input
              type="number"
              min={0}
              step="any"
              value={amountValue}
              placeholder="Amount"
              disabled={fieldsDisabled}
              onKeyDown={handleAmountKeyDown}
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
              onValueChange={handleUnitChange}
              open={unitSelectFocus.open && isXl}
              onOpenChange={unitSelectFocus.onOpenChange}
              disabled={unitSelectDisabled}
            >
              <SelectTrigger
                className="w-full"
                onFocus={unitSelectFocus.handleTriggerFocus}
              >
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent onCloseAutoFocus={handleUnitSelectCloseAutoFocus}>
                {availableUnits.map((conversion) => {
                  // Prefer conversion.unit so units added via ingredient edit appear immediately.
                  const unit = resolveUnitForConversion(conversion, unitById);
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
              data-quick-add-additional-info
              value={draft.additionalInfo ?? ""}
              disabled={fieldsDisabled}
              onKeyDown={handleCommitFieldKeyDown}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  additionalInfo: event.target.value || null,
                }))
              }
              placeholder="Additional info"
            />

            <Input
              value={draft.substitutionNote ?? ""}
              disabled={fieldsDisabled}
              onKeyDown={handleCommitFieldKeyDown}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  substitutionNote: event.target.value || null,
                }))
              }
              placeholder="Substitutions"
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
                onEditIngredientRequested(selectedIngredient.id, { source: "quick-add" });
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
