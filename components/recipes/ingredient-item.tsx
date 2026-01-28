"use client";

import { RecipeType } from "@/types/recipe";
import { IngredientType } from "@/types/ingredient";
import {
  formatIngredientAmount,
  getUnitDisplayName,
  getIngredientDisplay,
  getIngredientNutritionPer100g,
} from "@/lib/recipes/helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Info } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { IngredientIcon } from "../ingredient-icon";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { cn } from "@/lib/utils";

type IngredientItemProps = {
  recipeIngredient: RecipeType["ingredients"][number];
  replacementCandidates: IngredientType[];
  selectedUnitId: string | null;
  onUnitChange: (unitId: string | null) => void;
  servingScalingFactor: number;
  calorieScalingFactor: number;
  onAmountEdit: (ratio: number, activeCalorieScalingFactor: number) => void;
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
  onIngredientChange,
}: IngredientItemProps) {
  const { ingredient } = recipeIngredient;

  const { displayAmount, rawAmount, availableUnits } =
    getIngredientDisplay(
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

  const [isEditing, setIsEditing] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
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
    const displayed = rawAmount == null ? "" : formatIngredientAmount(rawAmount, 1);
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
    if (isNaN(newValue) || newValue <= 0 || rawAmount == null || rawAmount === 0) {
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
  const shouldShowUnitSelect = availableUnits.length > 1;

  return (
    <li className="flex items-center gap-2">
      <IngredientIcon icon={ingredient.icon} name={ingredient.name} />
      <span>
        {canRenderAmountAndUnit && (
          <>
            {isEditable ? (
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
                className="inline-flex w-20 h-6 px-1 text-xs text-center"
                aria-label={`Amount of ${ingredient.name}`}
              />
            ) : (
              displayAmount
            )}{" "}
            {shouldShowUnitSelect ? (
              <Select
                value={selectedUnitId ?? undefined}
                onValueChange={(value) => onUnitChange(value || null)}
                // Recipe page unit selectors should not be clearable.
                allowInlineClear={false}
              >
                <SelectTrigger
                  size="sm"
                  className="inline-flex h-6 px-2 text-xs [&>svg]:hidden"
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
              </Select>
            ) : (
              // Preserve row alignment by rendering a read-only single-option select.
              <Select
                value={selectedUnitId ?? undefined}
                disabled
                allowInlineClear={false}
              >
                <SelectTrigger
                  size="sm"
                  className="inline-flex h-6 px-2 text-xs border-transparent bg-transparent shadow-none [&_svg]:hidden disabled:opacity-100 disabled:cursor-default"
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
              </Select>
            )}{" "}
          </>
        )}
        {recipeIngredient.additionalInfo && (
          <span className="text-muted-foreground text-xs ml-1">
            ({recipeIngredient.additionalInfo})
          </span>
        )}
        {recipeIngredient.nutritionTarget === "PRIMARY_ONLY" && (
          <Badge variant="outline" className="ml-1 h-5 text-[10px]">
            Jagoda only
          </Badge>
        )}
        {recipeIngredient.nutritionTarget === "SECONDARY_ONLY" && (
          <Badge variant="outline" className="ml-1 h-5 text-[10px]">
            Nelson only
          </Badge>
        )}
        <Popover open={swapOpen} onOpenChange={setSwapOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="ml-2 h-6 px-2 text-xs">
              <IngredientIcon icon={ingredient.icon} name={ingredient.name} />
              <span className="ml-1 truncate max-w-28">{ingredient.name}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            {/* Inline ingredient selector used for swap simulation. */}
            <Command>
              <CommandInput placeholder="Search ingredient..." />
              <CommandList>
                <CommandEmpty>No ingredient found.</CommandEmpty>
                <CommandGroup>
                  {replacementCandidates.map((candidate) => (
                    <CommandItem
                      key={candidate.id}
                      value={candidate.name}
                      onSelect={() => {
                        onIngredientChange(candidate.id);
                        setSwapOpen(false);
                      }}
                    >
                      <IngredientIcon icon={candidate.icon} name={candidate.name} />
                      <span className="ml-2">{candidate.name}</span>
                      <span
                        className={cn(
                          "ml-auto inline-block h-2 w-2 rounded-full",
                          ingredient.id === candidate.id ? "bg-primary" : "bg-transparent",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground"
              aria-label={`Nutrition info for ${ingredient.name}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3">
            <p className="font-medium text-xs mb-1">Per 100g</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">Calories</span>
              <span>{nutrition.calories}</span>
              <span className="text-muted-foreground">Protein</span>
              <span>{nutrition.protein}g</span>
              <span className="text-muted-foreground">Fat</span>
              <span>{nutrition.fat}g</span>
              <span className="text-muted-foreground">Carbs</span>
              <span>{nutrition.carbs}g</span>
            </div>
          </PopoverContent>
        </Popover>
        {ingredient.supermarketUrl && (
          <a
            href={ingredient.supermarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-600 hover:underline text-xs"
          >
            🛒
          </a>
        )}
      </span>
    </li>
  );
}
