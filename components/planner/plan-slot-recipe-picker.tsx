"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import type { RecipeType } from "@/types/recipe";
import { RecipeCardBody } from "@/components/recipes/recipe-card-body";
import { RecipeGridEmpty } from "@/components/recipes/grid-empty";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import {
  SearchField,
  SearchFieldClear,
  SearchFieldInput,
} from "@/components/ui/searchfield";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIME_OPTIONS } from "@/lib/recipes/time-filter-options";
import {
  filterRecipes,
  getOccasionOptions,
} from "@/lib/planner/recipe-picker-filters";
import { cn } from "@/lib/utils";

type PlanSlotRecipePickerProps = {
  recipes: RecipeType[];
  selectedRecipeId: string | null;
  initialOccasionSlug?: string | null;
  onSelectRecipe: (recipe: RecipeType) => void;
};

/** Mini recipes browser for the meal dialog repository tab. */
export function PlanSlotRecipePicker({
  recipes,
  selectedRecipeId,
  initialOccasionSlug = null,
  onSelectRecipe,
}: PlanSlotRecipePickerProps) {
  const occasionOptions = useMemo(() => getOccasionOptions(recipes), [recipes]);

  // Only pre-fill occasion when it exists in the loaded recipes, so we never
  // open onto a guaranteed-empty grid.
  const resolvedInitialOccasion =
    initialOccasionSlug &&
    occasionOptions.some((option) => option.slug === initialOccasionSlug)
      ? initialOccasionSlug
      : "";

  const [search, setSearch] = useState("");
  const [occasion, setOccasion] = useState(resolvedInitialOccasion);
  const [time, setTime] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredRecipes = useMemo(
    () =>
      filterRecipes(recipes, {
        search,
        occasionSlug: occasion || null,
        handsOnTimeMax: time ? Number(time) : null,
      }),
    [occasion, recipes, search, time],
  );

  // Reset scroll to top whenever filters change so new results are visible.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [search, occasion, time]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-item border-b px-4 py-3 md:px-6">
        <div className="flex flex-col gap-item sm:flex-row">
          <SearchField
            className="w-full sm:flex-1"
            value={search}
            onChange={setSearch}
            aria-label="Search recipes"
          >
            <FieldGroup>
              <SearchIcon aria-hidden className="size-4 text-muted-foreground" />
              <SearchFieldInput placeholder="Search recipes by name..." />
              <SearchFieldClear>
                <XIcon aria-hidden className="size-4" />
              </SearchFieldClear>
            </FieldGroup>
          </SearchField>

          <div className="grid grid-cols-2 gap-item sm:contents">
            <Select
              value={occasion}
              onValueChange={(next) => setOccasion(next || "")}
              allowInlineClear
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Meal occasion" />
              </SelectTrigger>
              <SelectContent align="start">
                {occasionOptions.map((option) => (
                  <SelectItem key={option.slug} value={option.slug}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={time}
              onValueChange={(next) => setTime(next || "")}
              allowInlineClear
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Hands-on time" />
              </SelectTrigger>
              <SelectContent align="start">
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 md:px-6"
      >
        {filteredRecipes.length === 0 ? (
          <RecipeGridEmpty />
        ) : (
          <div className="grid grid-cols-1 gap-block sm:grid-cols-2 2xl:grid-cols-3">
            {filteredRecipes.map((recipe) => {
              const isSelected = recipe.id === selectedRecipeId;

              return (
                <button
                  key={recipe.id}
                  type="button"
                  className="text-left"
                  onClick={() => onSelectRecipe(recipe)}
                  aria-pressed={isSelected}
                  aria-label={`Select ${recipe.name}`}
                >
                  <RecipeCardBody
                    recipe={recipe}
                    className={cn(isSelected && "ring-2 ring-primary")}
                    imageOverlay={
                      isSelected ? (
                        // Match planner slot card selection checkbox (rectangular, elevated over image).
                        <span
                          className="absolute right-3 top-3 z-2"
                          aria-hidden
                        >
                          <Checkbox
                            checked
                            tabIndex={-1}
                            className={cn(
                              "pointer-events-none size-6 rounded-[6px] bg-card",
                              "[&_[data-slot=checkbox-indicator]_svg]:size-4",
                              "border-foreground/30 shadow-md data-[state=checked]:shadow-md",
                            )}
                          />
                        </span>
                      ) : null
                    }
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
