"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IngredientDeleteDialog } from "@/components/ingredients/ingredient-delete-dialog";
import { ROUTES } from "@/lib/constants";
import type { IngredientsPageItem } from "@/lib/db/ingredients";

type IngredientRowActionsProps = {
  ingredient: IngredientsPageItem;
  isAdmin: boolean;
};

// Row-level edit + delete actions; delete is list-only (not on the edit page).
export function IngredientRowActions({
  ingredient,
  isAdmin,
}: IngredientRowActionsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const canDelete = isAdmin || !ingredient.isGlobal;

  return (
    <>
      {/* Desktop: hidden until row hover/focus. Mobile: always visible (max-md overrides opacity-0). */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 pointer-events-none transition-opacity duration-150 max-md:opacity-100 max-md:pointer-events-auto group-hover/row:opacity-100 group-hover/row:pointer-events-auto group-focus-within/row:opacity-100 group-focus-within/row:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
        <Button
          asChild
          type="button"
          variant="outline"
          size="icon-sm"
        >
          <Link
            href={ROUTES.ingredientEdit(ingredient.slug)}
            aria-label={`Edit ${ingredient.name}`}
            title="Edit ingredient"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>

        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${ingredient.name}`}
            title="Delete ingredient"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {canDelete ? (
        <IngredientDeleteDialog
          ingredientId={ingredient.id}
          ingredientName={ingredient.name}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
        />
      ) : null}
    </>
  );
}
