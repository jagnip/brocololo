"use client";

import { useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { getRecipeDisplayImageUrl } from "@/lib/recipes/image";
import { getOrderedPlanSlots, getPlanSlotKey } from "@/lib/planner/helpers";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import type { PlanInputType, SlotInputType } from "@/types/planner";

const MEAL_GROUPS = [
  { type: "BREAKFAST", label: "Breakfast" },
  { type: "LUNCH", label: "Lunch" },
  { type: "DINNER", label: "Dinner" },
] as const;

type PlanMealChecklistProps = {
  plan: PlanInputType;
  onCheckedChange: (slotKeys: string[], checked: boolean) => void;
};

export function PlanMealChecklist({ plan, onCheckedChange }: PlanMealChecklistProps) {
  const id = useId();
  const meals = new Map<string, {
    name: string;
    href: string | null;
    imageUrl: string | null;
    mealType: SlotInputType["mealType"];
    slots: SlotInputType[];
  }>();

  for (const slot of getOrderedPlanSlots(plan)) {
    if (!slot.recipe && !slot.customMeal) continue;
    // Ingredient order is not part of a custom meal's identity.
    const key = slot.recipe
      ? `recipe:${slot.recipe.id}`
      : `custom:${JSON.stringify([
          slot.customMeal!.name,
          slot.customMeal!.ingredients
            .map(({ ingredientId, unitId, amount }) => [ingredientId, unitId, amount])
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        ])}`;
    const existing = meals.get(key);
    if (existing) {
      existing.slots.push(slot);
    } else {
      meals.set(key, {
        name: slot.recipe?.name ?? slot.customMeal!.name,
        href: slot.recipe ? ROUTES.recipe(slot.recipe.slug) : null,
        imageUrl: getRecipeDisplayImageUrl(slot.recipe?.images),
        mealType: slot.mealType,
        slots: [slot],
      });
    }
  }

  if (meals.size === 0) return null;

  return (
    <section aria-label="Meal checklist" className="mb-6 grid grid-cols-1 gap-6 pb-6 md:grid-cols-3">
      {MEAL_GROUPS.map(({ type, label }) => {
        const items = [...meals.entries()].filter(([, meal]) => meal.mealType === type);
        const remainingCount = items.filter(([, meal]) => meal.slots.some((slot) => !slot.used)).length;
        const headingId = `${id}-${type}`;

        return (
          <section key={type} aria-labelledby={headingId} className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id={headingId} className="type-h2">{label}</h2>
              <span className="type-caption text-muted-foreground">
                {remainingCount} {remainingCount === 1 ? "meal" : "meals"} left
              </span>
            </div>
            <ul className="space-y-2">
              {items.map(([key, meal], index) => {
                const cookedCount = meal.slots.filter((slot) => slot.used).length;
                const checked = cookedCount === meal.slots.length
                  ? true
                  : cookedCount > 0 ? "indeterminate" : false;
                const checkboxId = `${headingId}-${index}`;

                return (
                  <li key={key} data-cooked={checked === true}>
                    <Card
                      className="cursor-pointer gap-0 overflow-hidden rounded-md py-0 shadow-none transition-colors hover:bg-muted/40 focus-within:bg-muted/40"
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a, button")) return;
                        onCheckedChange(meal.slots.map(getPlanSlotKey), checked !== true);
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-item p-nest font-normal normal-case tracking-normal text-foreground">
                        <span className="relative flex shrink-0">
                          <Checkbox
                            id={checkboxId}
                            checked={checked}
                            aria-label={`Mark all ${meal.name} slots cooked`}
                            className={cn("size-5", checked === "indeterminate" && "[&_[data-slot=checkbox-indicator]]:invisible")}
                            onCheckedChange={(value) => onCheckedChange(meal.slots.map(getPlanSlotKey), value === true)}
                          />
                          {checked === "indeterminate" ? (
                            <Minus aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto size-3.5 text-foreground" />
                          ) : null}
                        </span>
                        <span className={cn("relative size-8 shrink-0 overflow-hidden rounded-sm", checked === true && "grayscale opacity-50")}>
                          {meal.imageUrl ? (
                            <Image src={meal.imageUrl} alt="" width={32} height={32} className="size-8 object-cover" />
                          ) : (
                            <RecipeImagePlaceholder showLabel={false} />
                          )}
                        </span>
                        <span className={cn("min-w-0 flex-1 break-words type-body font-medium", checked === true && "text-muted-foreground")}>
                          {meal.href ? (
                            <Link
                              href={meal.href}
                              className="hover:underline focus-visible:underline"
                            >
                              {meal.name}
                            </Link>
                          ) : meal.name}
                        </span>
                        <span className="type-caption shrink-0 tabular-nums text-muted-foreground" aria-label={`${meal.slots.length} planned slots`}>
                          {meal.slots.length}&times;
                        </span>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
