"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
  GroceriesEditCategoryOption,
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

// Synthetic select value for free-text quick-add drafts (mirrors category row pattern).
const QUICK_ADD_FREE_TEXT_OPTION_VALUE = "__free_text__quick_add";

type GroceriesEditQuickAddSectionProps = {
  ingredients: GroceriesEditIngredientOption[];
  categories: GroceriesEditCategoryOption[];
  ingredientById: Map<string, GroceriesEditIngredientOption>;
  unitById: Map<string, GroceriesEditUnitOption>;
  renderIngredientDropdownLabel: (option: SearchableSelectOption) => React.ReactNode;
  renderIngredientTriggerLabel: (option: SearchableSelectOption) => React.ReactNode;
  onAddItem: (draft: QuickAddDraft) => boolean;
  onEditIngredientRequested: (
    ingredientId: string,
    context?: GroceriesEditIngredientRequestContext,
  ) => void;
  onCreateIngredientRequested: (initialName: string, initialCategoryId?: string | null) => void;
  /** Set by parent after quick-add Plus flow creates a new ingredient. */
  linkedIngredientId?: string | null;
  onLinkedIngredientIdApplied?: () => void;
  /** Set by parent after ingredient edit saves a new unit from quick-add. */
  preferredUnitId?: string | null;
  onPreferredUnitIdApplied?: () => void;
};

export function GroceriesEditQuickAddSection({
  ingredients,
  categories,
  ingredientById,
  unitById,
  renderIngredientDropdownLabel,
  renderIngredientTriggerLabel,
  onAddItem,
  onEditIngredientRequested,
  onCreateIngredientRequested,
  linkedIngredientId,
  onLinkedIngredientIdApplied,
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

  const categoryOptions = useMemo<SearchableSelectOption[]>(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories],
  );

  const selectedIngredient = draft.ingredientId
    ? ingredientById.get(draft.ingredientId) ?? null
    : null;
  const isFreeText = !draft.ingredientId && draft.displayLabel.trim().length > 0;
  const fieldsDisabled = !selectedIngredient && !isFreeText;

  const availableUnits = useMemo(
    () => selectedIngredient?.unitConversions ?? [],
    [selectedIngredient],
  );
  const adHocUnits = useMemo(
    () => [...unitById.values()].sort((left, right) => left.name.localeCompare(right.name)),
    [unitById],
  );

  const resolvedIngredientOptions = useMemo(() => {
    if (draft.ingredientId || !draft.displayLabel.trim()) {
      return ingredientSearchOptions;
    }
    return [
      {
        value: QUICK_ADD_FREE_TEXT_OPTION_VALUE,
        label: draft.displayLabel,
      },
      ...ingredientSearchOptions,
    ];
  }, [draft.displayLabel, draft.ingredientId, ingredientSearchOptions]);

  const ingredientSelectValue =
    draft.ingredientId ??
    (draft.displayLabel.trim() ? QUICK_ADD_FREE_TEXT_OPTION_VALUE : null);

  const handleIngredientValueChange = useCallback(
    (nextIngredientId: string | null) => {
      if (nextIngredientId === QUICK_ADD_FREE_TEXT_OPTION_VALUE) {
        return;
      }

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

  const handleCreateFreeTextOption = useCallback((typedName: string) => {
    const label = typedName.trim();
    if (!label) return;

    setDraft({
      ...EMPTY_QUICK_ADD_DRAFT,
      displayLabel: label,
    });
  }, []);

  const handleCategoryChange = useCallback((nextCategoryId: string | null) => {
    setDraft((prev) => ({
      ...prev,
      ingredientCategoryId: nextCategoryId || null,
    }));
  }, []);

  // After ingredient or free-text select, focus amount so the user can type immediately.
  useEffect(() => {
    if (!draft.ingredientId && !draft.displayLabel.trim()) return;
    focusVisibleAmountInputInContainer(sectionRef.current);
  }, [draft.displayLabel, draft.ingredientId]);

  // Parent sets this after quick-add Plus creates an ingredient in the DB.
  useEffect(() => {
    if (!linkedIngredientId) return;

    const linkedIngredient = ingredientById.get(linkedIngredientId);
    if (!linkedIngredient) return;

    setDraft((prev) => {
      const linkedDraft = getQuickAddDraftForIngredient(linkedIngredient);
      const allowedUnitIds = new Set(
        linkedIngredient.unitConversions.map((conversion) => conversion.unitId),
      );

      return {
        ...linkedDraft,
        amount: prev.amount,
        unitId:
          prev.unitId != null && allowedUnitIds.has(prev.unitId)
            ? prev.unitId
            : linkedDraft.unitId,
        additionalInfo: prev.additionalInfo ?? linkedDraft.additionalInfo,
        substitutionNote: prev.substitutionNote ?? linkedDraft.substitutionNote,
      };
    });
    onLinkedIngredientIdApplied?.();
  }, [ingredientById, linkedIngredientId, onLinkedIngredientIdApplied]);

  // Parent sets this after saving a new unit from the quick-add edit dialog.
  useEffect(() => {
    if (!preferredUnitId) return;
    setDraft((prev) => ({ ...prev, unitId: preferredUnitId }));
    onPreferredUnitIdApplied?.();
  }, [preferredUnitId, onPreferredUnitIdApplied]);

  const amountValue = draft.amount === null ? "" : String(draft.amount);
  const unitSelectDisabled = selectedIngredient
    ? availableUnits.length === 0
    : isFreeText
      ? adHocUnits.length === 0
      : true;
  const categorySelectReadOnly = Boolean(selectedIngredient);
  const categorySelectDisabled = !isFreeText && !selectedIngredient;
  const categorySelectValue = selectedIngredient
    ? selectedIngredient.categoryId
    : draft.ingredientCategoryId;

  const canAddItem = Boolean(
    draft.ingredientId ||
      (draft.displayLabel.trim() && draft.ingredientCategoryId),
  );

  const isXl = useIsXl();
  const unitSelectFocus = useSelectOpenOnTabFromAdjacent({
    disabled: unitSelectDisabled,
    resetKey: draft.ingredientId ?? draft.displayLabel,
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
    if (!canAddItem) return;
    const added = onAddItem(draft);
    if (added) {
      setDraft(EMPTY_QUICK_ADD_DRAFT);
      focusQuickAddIngredientSelector(sectionRef.current);
    }
  }, [canAddItem, draft, onAddItem]);

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

  const ingredientSelectProps = {
    className: "min-w-0 w-full font-normal",
    options: resolvedIngredientOptions,
    renderLabel: renderIngredientDropdownLabel,
    renderTriggerLabel: renderIngredientTriggerLabel,
    value: ingredientSelectValue,
    onValueChange: handleIngredientValueChange,
    onCreateOption: handleCreateFreeTextOption,
    createOptionLabel: (searchTerm: string) => `Add "${searchTerm}"`,
    placeholder: "Search ingredients...",
    searchPlaceholder: "Search ingredients...",
    emptyLabel: "No ingredient found.",
  };

  const renderIngredientSelect = () => (
    <SearchableSelect {...ingredientSelectProps} />
  );

  const renderCategorySelect = () => (
    <SearchableSelect
      className="min-w-0 w-full font-normal"
      options={categoryOptions}
      value={categorySelectValue}
      onValueChange={handleCategoryChange}
      placeholder="Category"
      searchPlaceholder="Search categories..."
      emptyLabel="No category found."
      disabled={categorySelectDisabled}
      readOnly={categorySelectReadOnly}
      allowClear={!categorySelectReadOnly}
    />
  );

  const renderUnitSelect = (layoutActive: boolean) => (
    <Select
      value={draft.unitId ?? ""}
      onValueChange={handleUnitChange}
      open={layoutActive && unitSelectFocus.open}
      onOpenChange={unitSelectFocus.onOpenChange}
      disabled={unitSelectDisabled}
    >
      <SelectTrigger className="w-full" onFocus={unitSelectFocus.handleTriggerFocus}>
        <SelectValue placeholder="Unit" />
      </SelectTrigger>
      <SelectContent onCloseAutoFocus={handleUnitSelectCloseAutoFocus}>
        {selectedIngredient
          ? availableUnits.map((conversion) => {
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
            })
          : adHocUnits.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {getUnitDisplayName({
                  amount: draft.amount,
                  unitName: unit.name,
                  unitNamePlural: unit.namePlural,
                })}
              </SelectItem>
            ))}
      </SelectContent>
    </Select>
  );

  const amountInput = (
    <Input
      key={`quick-add-amount-${draft.ingredientId ?? (draft.displayLabel || "none")}`}
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
  );

  const additionalInfoInput = (
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
  );

  const substitutionNoteInput = (
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
  );

  const actionButton = selectedIngredient ? (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={fieldsDisabled}
      aria-label={`Edit ${selectedIngredient.name}`}
      onClick={() => {
        onEditIngredientRequested(selectedIngredient.id, { source: "quick-add" });
      }}
    >
      <Pencil className="h-4 w-4" aria-hidden />
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={!isFreeText}
      aria-label={
        isFreeText
          ? `Create ingredient from ${draft.displayLabel}`
          : "Create ingredient"
      }
      onClick={() => {
        if (!isFreeText) return;
        onCreateIngredientRequested(
          draft.displayLabel.trim(),
          draft.ingredientCategoryId,
        );
      }}
    >
      <Plus className="h-4 w-4" aria-hidden />
    </Button>
  );

  const addItemButton = (
    <Button
      type="button"
      variant="outline"
      disabled={!canAddItem}
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

          {/* Mobile/tablet: ingredient full width, then amount · unit · category · action. */}
          <div className="space-y-2 xl:hidden">
            <div data-quick-add-ingredient-select className="min-w-0 w-full">
              {renderIngredientSelect()}
            </div>

            <div className="grid items-start gap-2 md:grid-cols-[7rem_10rem_minmax(0,1fr)_auto]">
              {amountInput}
              {renderUnitSelect(!isXl)}
              {renderCategorySelect()}
              {actionButton}
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              {additionalInfoInput}
              {substitutionNoteInput}
            </div>
          </div>

          {/* Desktop: row 1 = ingredient · amount · unit · category; row 2 = notes · action. */}
          <div className="hidden xl:block xl:space-y-2">
            <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1.3fr)_7rem_10rem_minmax(0,1fr)]">
              <div data-quick-add-ingredient-select className="min-w-0 w-full">
                {renderIngredientSelect()}
              </div>
              {amountInput}
              {renderUnitSelect(isXl)}
              {renderCategorySelect()}
            </div>

            <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              {additionalInfoInput}
              {substitutionNoteInput}
              {actionButton}
            </div>
          </div>
        </div>
      </NutritionPersonCard>
    </section>
  );
}
