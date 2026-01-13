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
import { cn } from "@/lib/utils/cn";
import { IngredientType } from "@/types/ingredient";
import { RecipeIngredientInputType } from "@/lib/validations/recipe";


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
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const addIngredient = () => {
    onChange([...value, { ingredientId: "", amount: "" }]);
  };

  const removeIngredient = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    if (openIndex === index) {
      setOpenIndex(null);
    }
  };

  const updateIngredient = (
    index: number,
    field: "ingredientId" | "amount",
    newValue: string
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  const getIngredientName = (ingredientId: string) => {
    const ingredient = ingredients.find((ing) => ing.id === ingredientId);
    return ingredient?.name || "Select ingredient...";
  };

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <Input
            placeholder="Amount (e.g., 2 slices)"
            value={item.amount}
            onChange={(e) => updateIngredient(index, "amount", e.target.value)}
            className="flex-1"
          />
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
                          onSelect={() => {
                            updateIngredient(
                              index,
                              "ingredientId",
                              ingredient.id
                            );
                            setOpenIndex(null);
                          }}
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeIngredient(index)}
            className="mt-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addIngredient}>
        Add Ingredient
      </Button>
    </div>
  );
}
