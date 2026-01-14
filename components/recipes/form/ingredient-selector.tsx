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

  //tracks which ingredient is currently open in the dropdown
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const addIngredient = () => {
    onChange([...value, { ingredientId: "", amount: 0 }]);
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
    newValue: string | number
  ) => {
    const updated = [...value]; // shallow copy of current ingredient array { ingredientId: "abc", amount: 100 }
    updated[index] = { ...updated[index], [field]: newValue }; // spreads existing, then overwrites given field
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
            type="number"
            placeholder="Grams, e.g. 200"
            value={item.amount === 0 ? "" : item.amount.toString()}
            onChange={(e) => {
              const numValue =
                e.target.value === "" ? 0 : parseFloat(e.target.value);
              updateIngredient(index, "amount", numValue);
            }}
            className="flex-1"
            min={0}
            step={10}
          />
          <span className="text-sm text-muted-foreground">grams</span>
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
