"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { IngredientSupermarketLinkButton } from "@/components/groceries/ingredient-supermarket-link-button";
import { IngredientNameLink } from "@/components/ingredients/ingredient-name-link";
import { IngredientIcon } from "@/components/ingredient-icon";
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
  ingredientSupermarketUrl: string | null;
  ingredientDescriptor: string | null;
  ingredientIcon?: string | null;
  pageVariant?: boolean;
  isAddingToGroceries?: boolean;
  isRemovingFromList?: boolean;
  onAddToGroceries?: (ingredientId: string) => void;
  onEditIngredientRequested?: (ingredientId: string) => void;
  onRemoveFromList: (ingredientId: string) => void;
};

export function GroceriesEditLibraryRow({
  ingredientId,
  ingredientSlug,
  ingredientName,
  ingredientSupermarketUrl,
  ingredientDescriptor,
  ingredientIcon,
  pageVariant = false,
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
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {pageVariant ? (
          <IngredientIcon icon={ingredientIcon ?? null} name={ingredientName} size={28} />
        ) : null}
        <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <IngredientNameLink
            name={ingredientName}
            slug={ingredientSlug}
            className={pageVariant ? "truncate text-base font-medium text-foreground" : "truncate text-sm leading-none text-foreground"}
          />
          <IngredientSupermarketLinkButton
            href={ingredientSupermarketUrl}
            ingredientLabel={ingredientName}
          />
        </div>
        {descriptor ? (
          <div className="truncate text-xs text-muted-foreground">{descriptor}</div>
        ) : null}
        </div>
      </div>

      {/* Plus pushes this ingredient into the grocery edit list (parent decides
          whether to scroll-to-existing or append a new row). */}
      {onAddToGroceries ? <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`Add ${ingredientName} to grocery list`}
        disabled={isAddingToGroceries}
        onClick={() => onAddToGroceries(ingredientId)}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button> : null}

      {pageVariant ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 pointer-events-none transition-opacity max-md:opacity-100 max-md:pointer-events-auto group-hover/row:opacity-100 group-hover/row:pointer-events-auto group-focus-within/row:opacity-100 group-focus-within/row:pointer-events-auto"
          aria-label={`Remove ${ingredientName} from list`}
          disabled={isRemovingFromList}
          onClick={() => onRemoveFromList(ingredientId)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      ) : (
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
          {onEditIngredientRequested ? <DropdownMenuItem onClick={() => onEditIngredientRequested(ingredientId)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit ingredient
          </DropdownMenuItem> : null}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onRemoveFromList(ingredientId)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove from list
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      )}
    </div>
  );
}
