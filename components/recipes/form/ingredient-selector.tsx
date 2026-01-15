"use client";

import * as React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { IngredientType } from "@/types/ingredient";
import { RecipeIngredientInputType } from "@/lib/validations/recipe";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type IngredientSelectorProps = {
  ingredients: IngredientType[];
  value: RecipeIngredientInputType[];
  onChange: (value: RecipeIngredientInputType[]) => void;
};

export function IngredientSelector({
  ingredients,
  value,
  onChange,
}: IngredientSelectorProps) {
  //tracks which ingredient is currently open in the dropdown
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const addIngredient = () => {
    onChange([
      ...value,
      {
        ingredientId: "",
        amount: null,
        unitId: "",
        excludeFromNutrition: false,
        additionalInfo: null,
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    if (openIndex === index) {
      setOpenIndex(null);
    }
  };

  const updateIngredient = (
    index: number,
    patch: Partial<RecipeIngredientInputType>
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const getIngredientName = (ingredientId: string) => {
    const ingredient = ingredients.find((ing) => ing.id === ingredientId);
    return ingredient?.name || "Select ingredient...";
  };

  const getUnitsForIngredient = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    return ing?.unitConversions ?? [];
  };

  const getDefaultUnitIdForIngredient = (ingredientId: string) => {
    const units = getUnitsForIngredient(ingredientId);
    const gramUnit = units.find((u) => u.unit.name === "g");
    return gramUnit?.unitId ?? units[0]?.unitId ?? "";
  };

  const handleIngredientSelect = (index: number, ingredientId: string) => {
    const unitId = getDefaultUnitIdForIngredient(ingredientId);
    updateIngredient(index, { ingredientId, unitId });
    setOpenIndex(null);
  };

  return (
    <div className="space-y-2">
      {value.map((item, index) => {
        const units = getUnitsForIngredient(item.ingredientId);

        return (
          <div key={index} className="flex gap-2 items-center">
            {/* Amount input */}
            <Input
              type="number"
              placeholder="Amount"
              value={item.amount == null ? "" : item.amount.toString()}
              onChange={(e) => {
                const numValue =
                  e.target.value === "" ? null : parseFloat(e.target.value);
                updateIngredient(index, { amount: numValue });
              }}
              className="flex-1"
              min={0}
              step={0.1}
            />

            {/* Unit selector */}
            <Select
              key={`${item.ingredientId}-${index}`}
              value={item.unitId || undefined}
              onValueChange={(unitId) => {
                // Prevent clearing unitId if it's valid and ingredient is selected
                if (!unitId && item.ingredientId && item.unitId) {
                  return; // Don't clear if we have a valid unitId
                }
                updateIngredient(index, { unitId });
              }}
              disabled={!item.ingredientId}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((uc) => (
                  <SelectItem key={uc.unitId} value={uc.unitId}>
                    {uc.unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ingredient selector */}
            <div className="relative flex-1">
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between",
                  !item.ingredientId && "text-muted-foreground"
                )}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {getIngredientName(item.ingredientId)}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
              {openIndex === index && (
                <div className="absolute z-50 w-full mt-1">
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Search ingredients..." />
                    <CommandList>
                      <CommandEmpty>No ingredient found.</CommandEmpty>
                      <CommandGroup>
                        {ingredients.map((ingredient) => (
                          <CommandItem
                            key={ingredient.id}
                            value={ingredient.name}
                            onSelect={() =>
                              handleIngredientSelect(index, ingredient.id)
                            }
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                item.ingredientId === ingredient.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {ingredient.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>

            {/* Additional info input */}
            <Input
              type="text"
              placeholder="Additional info"
              value={item.additionalInfo || ""}
              onChange={(e) => {
                updateIngredient(index, { additionalInfo: e.target.value });
              }}
              className="w-32"
              maxLength={50}
            />

            {/* Exclude from nutrition checkbox */}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={item.excludeFromNutrition || false}
                  onCheckedChange={(checked) =>
                    updateIngredient(index, { excludeFromNutrition: !!checked })
                  }
                />
                <span className="text-muted-foreground">Exclude</span>
              </label>
            </div>
            {/* Remove ingredient button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeIngredient(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="outline" onClick={addIngredient}>
        Add Ingredient
      </Button>
    </div>
  );
}
