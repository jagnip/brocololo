"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { IngredientNameLink } from "@/components/ingredients/ingredient-name-link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// One row in the library panel: a single ingredient that can either be
// pushed into the grocery list (+) or managed via overflow menu (edit /
// remove from this saved list). Kept presentational/stateless on purpose.
type GroceriesEditLibraryRowProps = {
  ingredientId: string;
  ingredientSlug: string;
  ingredientName: string;
  ingredientDescriptor: string | null;
  isAddingToGroceries?: boolean;
  isRemovingFromList?: boolean;
  onAddToGroceries: (ingredientId: string) => void;
  onEditIngredientRequested: (ingredientId: string) => void;
  onRemoveFromList: (ingredientId: string) => void;
};

export function GroceriesEditLibraryRow({
  ingredientId,
  ingredientSlug,
  ingredientName,
  ingredientDescriptor,
  isAddingToGroceries = false,
  isRemovingFromList = false,
  onAddToGroceries,
  onEditIngredientRequested,
  onRemoveFromList,
}: GroceriesEditLibraryRowProps) {
  const descriptor = ingredientDescriptor?.trim() ?? "";

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Name links to ingredient edit; descriptor stays muted below. */}
      <div className="min-w-0 flex-1">
        <IngredientNameLink
          name={ingredientName}
          slug={ingredientSlug}
          className="truncate text-sm leading-none text-foreground"
        />
        {descriptor ? (
          <div className="truncate text-xs text-muted-foreground">{descriptor}</div>
        ) : null}
      </div>

      {/* Plus pushes this ingredient into the grocery edit list (parent decides
          whether to scroll-to-existing or append a new row). */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`Add ${ingredientName} to grocery list`}
        disabled={isAddingToGroceries}
        onClick={() => onAddToGroceries(ingredientId)}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>

      {/* Overflow menu: edit ingredient in dialog or remove from this list. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Actions for ${ingredientName}`}
            disabled={isRemovingFromList}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEditIngredientRequested(ingredientId)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit ingredient
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onRemoveFromList(ingredientId)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove from list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
