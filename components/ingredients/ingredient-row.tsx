import Link from "next/link";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IngredientIcon } from "@/components/ingredient-icon";
import { ROUTES } from "@/lib/constants";
import { getIngredientTitleParts } from "@/lib/ingredients/format";
import type { IngredientsPageItem } from "@/lib/db/ingredients";

type IngredientRowProps = {
  ingredient: IngredientsPageItem;
};

// Single ingredient row visualization. Pure presentation: no client hooks needed.
export function IngredientRow({ ingredient }: IngredientRowProps) {
  // Build one combined metadata suffix: "(descriptor, brand)" (or a single item if one is missing).
  const title = getIngredientTitleParts(ingredient);
  const descriptor = ingredient.descriptor?.trim();
  const brand = ingredient.brand?.trim();
  const metaParts = [descriptor, brand].filter(Boolean) as string[];
  const combinedMeta = metaParts.length > 0 ? `(${metaParts.join(", ")})` : null;

  return (
    <li className="group/row flex flex-col gap-item rounded-md border border-border/60 p-nest transition-colors hover:bg-muted/30 focus-within:bg-muted/30">
      {/* Top row: identity/meta (left) + nutrition (md+ right). */}
      <div className="flex items-center justify-between gap-item">
        <div className="flex min-w-0 flex-1 items-center gap-item">
          {/* Slightly larger icon to improve scanability and match the requested emphasis. */}
          <IngredientIcon icon={ingredient.icon} name={ingredient.name} size={28} />
          {/* Identity row wraps so descriptor/brand/category badge fit on small screens. */}
          <div className="flex min-w-0 flex-wrap items-center gap-item">
            <p className="min-w-0 truncate font-medium">
              {title.name}
              {combinedMeta ? (
                <span className="text-muted-foreground"> {combinedMeta}</span>
              ) : null}
            </p>
            {/* Category uses secondary treatment per latest visual direction. */}
            <Badge variant="secondary">{ingredient.category.name}</Badge>
            {/* Edit action fades in on row hover; focus-visible keeps keyboard navigation usable. */}
            <Button
              asChild
              type="button"
              variant="outline"
              size="icon-sm"
              className="opacity-0 pointer-events-none transition-opacity duration-150 group-hover/row:opacity-100 group-hover/row:pointer-events-auto group-focus-within/row:opacity-100 group-focus-within/row:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
            >
              <Link
                href={ROUTES.ingredientEdit(ingredient.slug)}
                aria-label={`Edit ${ingredient.name}`}
                title="Edit ingredient"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Nutrition badges sit to the right on md+; on small screens they wrap below (see list further down). */}
        <ul
          aria-label="Nutrition per 100g"
          className="hidden shrink-0 items-center gap-1 md:flex"
        >
          <li>
            <Badge variant="outline">{ingredient.calories} kcal</Badge>
          </li>
          <li>
            <Badge variant="outline">{ingredient.proteins}g protein</Badge>
          </li>
          <li>
            <Badge variant="outline">{ingredient.fats}g fat</Badge>
          </li>
          <li>
            <Badge variant="outline">{ingredient.carbs}g carbs</Badge>
          </li>
        </ul>

      </div>

      {/* Mobile-only nutrition row: keeps the top row compact on small screens. */}
      <ul
        aria-label="Nutrition per 100g"
        className="flex flex-wrap items-center gap-1 md:hidden"
      >
        <li>
          <Badge variant="outline">{ingredient.calories} kcal</Badge>
        </li>
        <li>
          <Badge variant="outline">{ingredient.proteins}g protein</Badge>
        </li>
        <li>
          <Badge variant="outline">{ingredient.fats}g fat</Badge>
        </li>
        <li>
          <Badge variant="outline">{ingredient.carbs}g carbs</Badge>
        </li>
      </ul>

      {/* Conversions intentionally hidden for now per product direction. */}
    </li>
  );
}
