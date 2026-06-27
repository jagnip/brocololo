"use client";

import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { IngredientNameLink } from "@/components/ingredients/ingredient-name-link";
import { cn } from "@/lib/utils";

/** Minimal ingredient fields used by shared SearchableSelect label renderers. */
export type IngredientSearchSelectSource = {
  id: string;
  slug?: string;
  name: string;
  brand: string | null;
  descriptor?: string | null;
  icon?: string | null;
  category?: { name: string } | null;
};

export function ingredientsToSearchableSelectOptions(
  ingredients: IngredientSearchSelectSource[],
): SearchableSelectOption[] {
  return ingredients.map((ingredient) => ({
    value: ingredient.id,
    label: ingredient.name,
    icon: ingredient.icon ?? undefined,
    searchText: [
      ingredient.name,
      ingredient.descriptor,
      ingredient.brand,
      ingredient.category?.name,
    ]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean)
      .join(" "),
  }));
}

export function buildIngredientSearchSourceMap(
  ingredients: IngredientSearchSelectSource[],
): Map<string, IngredientSearchSelectSource> {
  return new Map(ingredients.map((i) => [i.id, i] as const));
}

function metadataParts(ing: IngredientSearchSelectSource | undefined): string[] {
  if (!ing) return [];
  const categoryName = ing.category?.name?.trim();
  const descriptor = ing.descriptor?.trim();
  const brand = ing.brand?.trim();
  return [categoryName, descriptor, brand].filter(Boolean) as string[];
}

/** Dropdown list rows: name + muted second line (category · descriptor · brand). */
export function renderIngredientSearchDropdownLabel(
  option: SearchableSelectOption,
  byId: Map<string, IngredientSearchSelectSource>,
  options?: { linkable?: boolean },
) {
  const ing = byId.get(option.value);
  const secondaryParts = metadataParts(ing);
  const linkable = options?.linkable ?? true;
  return (
    <span className="flex min-w-0 flex-col gap-0.5 text-left">
      {linkable ? (
        <IngredientNameLink
          name={option.label}
          slug={ing?.slug}
          className="truncate font-normal text-foreground"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        />
      ) : (
        <span className="truncate font-normal text-foreground">{option.label}</span>
      )}
      {secondaryParts.length > 0 ? (
        <span className="truncate text-xs leading-snug text-muted-foreground">
          {secondaryParts.join(" · ")}
        </span>
      ) : null}
    </span>
  );
}

/** Closed trigger: name in default color; descriptor only in muted text after · */
export function renderIngredientSearchTriggerLabel(
  option: SearchableSelectOption,
  byId: Map<string, IngredientSearchSelectSource>,
  options?: { linkable?: boolean },
) {
  const ing = byId.get(option.value);
  const descriptor = ing?.descriptor?.trim();
  const linkable = options?.linkable ?? true;
  return (
    <span className="flex min-w-0 max-w-full items-baseline gap-x-1.5 truncate text-left">
      <span
        className={cn(
          "shrink-0 font-normal text-foreground",
          linkable &&
            "group-hover/trigger:underline group-focus-visible/trigger:underline underline-offset-2",
        )}
      >
        {option.label}
      </span>
      {descriptor ? (
        <span className="min-w-0 truncate font-normal text-muted-foreground">
          · {descriptor}
        </span>
      ) : null}
    </span>
  );
}
