"use client";

import { RecipeType } from "@/types/recipe";
import { IngredientType } from "@/types/ingredient";
import {
  formatIngredientAmount,
  getUnitDisplayName,
  getIngredientDisplay,
  getIngredientNutritionPer100g,
  isGramUnit,
  scaleIngredientNutritionForGrams,
} from "@/lib/recipes/helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ArrowLeftRight,
  ChevronDownIcon,
  Info,
  ShoppingBasket,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { IngredientIcon } from "../ingredient-icon";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { IngredientNutritionalInfo } from "./ingredient-nutritional-info";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";

type IngredientItemProps = {
  recipeIngredient: RecipeType["ingredients"][number];
  replacementCandidates: IngredientType[];
  selectedUnitId: string | null;
  onUnitChange: (unitId: string | null) => void;
  servingScalingFactor: number;
  calorieScalingFactor: number;
  onAmountEdit: (ratio: number, activeCalorieScalingFactor: number) => void;
  showApplyScaleAction: boolean;
  onApplyScaleToAll: () => void;
  onIngredientChange: (ingredientId: string) => void;
};

export function IngredientItem({
  recipeIngredient,
  replacementCandidates,
  selectedUnitId,
  onUnitChange,
  servingScalingFactor,
  calorieScalingFactor,
  onAmountEdit,
  showApplyScaleAction,
  onApplyScaleToAll,
  onIngredientChange,
}: IngredientItemProps) {
  const { ingredient } = recipeIngredient;

  const {
    displayAmount,
    rawAmount,
    rawAmountInGrams,
    selectedUnitGramsPerUnit,
    displayUnitName,
    displayUnitNamePlural,
    availableUnits,
  } = getIngredientDisplay(
    recipeIngredient.amount,
    recipeIngredient.unit?.id ?? null,
    recipeIngredient.unit?.name ?? null,
    selectedUnitId,
    ingredient.unitConversions,
    servingScalingFactor,
    calorieScalingFactor,
  );

  const getUnitOptionLabel = (unitId: string) => {
    // Recompute per target unit so option labels pluralize against converted amounts.
    const optionDisplay = getIngredientDisplay(
      recipeIngredient.amount,
      recipeIngredient.unit?.id ?? null,
      recipeIngredient.unit?.name ?? null,
      unitId,
      ingredient.unitConversions,
      servingScalingFactor,
      calorieScalingFactor,
    );
    return getUnitDisplayName({
      amount: optionDisplay.rawAmount,
      unitName: optionDisplay.displayUnitName,
      unitNamePlural: optionDisplay.displayUnitNamePlural,
    });
  };

  const nutrition = getIngredientNutritionPer100g(ingredient);
  // Build macro snapshots for selected unit and currently selected amount.
  const showPerOneSelectedUnitColumn =
    selectedUnitGramsPerUnit != null && !isGramUnit(displayUnitName);
  const oneSelectedUnitNutrition = !showPerOneSelectedUnitColumn
    ? null
    : scaleIngredientNutritionForGrams(nutrition, selectedUnitGramsPerUnit);
  const selectedAmountNutrition =
    rawAmountInGrams == null
      ? null
      : scaleIngredientNutritionForGrams(nutrition, rawAmountInGrams);
  const oneUnitHeader =
    displayUnitName && showPerOneSelectedUnitColumn
      ? `1 ${displayUnitName} (${formatIngredientAmount(
          selectedUnitGramsPerUnit ?? 0,
          2,
        )}g)`
      : null;
  const selectedAmountText =
    rawAmount == null
      ? null
      : rawAmount > 0 && rawAmount < 0.1
        ? "<0.1"
        : formatIngredientAmount(rawAmount, 2);
  const selectedUnitLabel = getUnitDisplayName({
    amount: rawAmount,
    unitName: displayUnitName,
    unitNamePlural: displayUnitNamePlural,
  });
  const selectedAmountHeader =
    selectedAmountText && selectedUnitLabel && rawAmountInGrams != null
      ? isGramUnit(displayUnitName)
        ? `${selectedAmountText}g`
        : `${selectedAmountText} ${selectedUnitLabel} (${formatIngredientAmount(
            rawAmountInGrams,
            2,
          )}g)`
      : null;

  const [isEditing, setIsEditing] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [showNutritionDetails, setShowNutritionDetails] = useState(false);
  const [editValue, setEditValue] = useState("");
  const initialEditValueRef = useRef("");
  const committedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Select all text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleFocus = () => {
    committedRef.current = false;
    // Mirror non-edit display format so the input doesn't jump from 50 -> 50.0.
    const displayed =
      rawAmount == null ? "" : formatIngredientAmount(rawAmount, 2);
    setIsEditing(true);
    setEditValue(displayed);
    initialEditValueRef.current = displayed;
  };

  const handleCommit = () => {
    // Prevent double-commit when Enter triggers blur
    if (committedRef.current) return;
    committedRef.current = true;
    setIsEditing(false);

    if (editValue === initialEditValueRef.current) return;

    const newValue = parseFloat(editValue);
    if (
      isNaN(newValue) ||
      newValue <= 0 ||
      rawAmount == null ||
      rawAmount === 0
    ) {
      return;
    }

    onAmountEdit(newValue / rawAmount, calorieScalingFactor);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      committedRef.current = true;
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const isEditable = rawAmount != null;
  const canRenderAmountAndUnit =
    recipeIngredient.unit != null && displayAmount != null;
  const ingredientCandidates = [
    ingredient,
    ...replacementCandidates.filter(
      (candidate) => candidate.id !== ingredient.id,
    ),
  ];

  return (
    <li className="flex flex-col gap-1 rounded-md border border-border/60 p-1">
      <div className="flex items-center gap-1 md:flex-col md:items-stretch lg:flex-row lg:items-center">
        {/* <IngredientIcon icon={ingredient.icon} name={ingredient.name} /> */}
        {canRenderAmountAndUnit && (
          <div className="order-1 md:order-2 lg:order-1 flex items-center gap-1 md:w-full lg:w-auto">
            {isEditable ? (
              /* Amount */
              <div className="w-16 h-8 flex items-center justify-center">
                <Input
                  ref={inputRef}
                  type="number"
                  min="0.1"
                  step="any"
                  value={isEditing ? editValue : displayAmount}
                  onFocus={handleFocus}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleCommit}
                  onKeyDown={handleKeyDown}
                  // Match select/button vertical rhythm: keep exact height and remove default vertical padding.
                  // Number inputs can look left-aligned in some browsers; force centered text.
                  className="w-16 min-w-16 h-8 px-1 py-0 text-sm leading-none text-center! tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label={`Amount of ${ingredient.name}`}
                />
              </div>
            ) : (
              <div className="w-16 min-w-16 h-8 flex items-center justify-center text-sm leading-none text-center tabular-nums">
                {displayAmount}
              </div>
            )}{" "}
            <Select
              value={selectedUnitId ?? undefined}
              disabled={false}
              onValueChange={(value) => onUnitChange(value || null)}
              // Recipe page unit selectors should not be clearable.
              allowInlineClear={false}
            >
              {/* Unit */}
              <SelectTrigger
                size="sm"
                className="inline-flex h-8 px-2 py-0 text-sm items-center [&>svg]:hidden w-23 min-w-23 md:w-full md:min-w-0 lg:w-23 lg:min-w-23"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((uc) => (
                  <SelectItem key={uc.unitId} value={uc.unitId}>
                    {getUnitOptionLabel(uc.unitId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>{" "}
          </div>
        )}
        <Popover open={swapOpen} onOpenChange={setSwapOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="order-2 md:order-1 lg:order-2 h-8 flex-1 min-w-0 md:w-full md:flex-none lg:flex-1 px-3 text-sm font-normal justify-start text-left gap-0 bg-transparent hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
            >
              {" "}
              <IngredientIcon icon={ingredient.icon} name={ingredient.name} />
              <span className="truncate w-full text-left ml-2">
                {ingredient.name}
              </span>
              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <Command>
              <CommandInput placeholder="Search ingredient..." />
              <CommandList>
                <CommandEmpty>No ingredient found.</CommandEmpty>
                <CommandGroup>
                  {ingredientCandidates.map((candidate) => (
                    <CommandItem
                      key={candidate.id}
                      value={candidate.name}
                      onSelect={() => {
                        onIngredientChange(candidate.id);
                        setSwapOpen(false);
                      }}
                      className="text-left"
                    >
                      <IngredientIcon
                        icon={candidate.icon}
                        name={candidate.name}
                      />
                      <span className="ml-2 truncate w-full text-left">
                        {candidate.name}
                      </span>
                      <span
                        className={[
                          "ml-auto inline-block h-2 w-2 rounded-full",
                          ingredient.id === candidate.id
                            ? "bg-primary"
                            : "bg-transparent",
                        ].join(" ")}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={`Nutrition details for ${ingredient.name}`}
            aria-expanded={showNutritionDetails}
            onClick={() => setShowNutritionDetails((prev) => !prev)}
          >
            <Info className="h-4 w-4" />
          </Button>
          {ingredient.supermarketUrl && (
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <a
                href={ingredient.supermarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open supermarket link for ${ingredient.name}`}
                title="Open supermarket link"
              >
                <ShoppingBasket className="h-4 w-4" />
              </a>
            </Button>
          )}
          {showApplyScaleAction && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              // One-click action: apply this row's ratio to every ingredient row.
              onClick={onApplyScaleToAll}
              aria-label={`Scale all ingredients based on ${ingredient.name}`}
              title="Apply this amount change to all ingredients"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {recipeIngredient.nutritionTarget === "PRIMARY_ONLY" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Jagoda only"
              title="Jagoda only"
            >
              J
            </Button>
          )}
          {recipeIngredient.nutritionTarget === "SECONDARY_ONLY" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Nelson only"
              title="Nelson only"
            >
              N
            </Button>
          )}
          {recipeIngredient.additionalInfo && (
            <span className="text-muted-foreground text-sm">
              ({recipeIngredient.additionalInfo})
            </span>
          )}
        </div>
      </div>
      <IngredientNutritionalInfo
        isOpen={showNutritionDetails}
        nutrition={nutrition}
        oneUnitHeader={oneUnitHeader}
        selectedAmountHeader={selectedAmountHeader}
        oneSelectedUnitNutrition={oneSelectedUnitNutrition}
        selectedAmountNutrition={selectedAmountNutrition}
      />
    </li>
  );
}
