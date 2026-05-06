"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// One row in the library panel: a single ingredient that can either be
// pushed into the grocery list (+) or removed from this library list (trash).
// Kept presentational/stateless on purpose — the parent panel owns all data.
type GroceriesEditLibraryRowProps = {
  ingredientId: string;
  ingredientName: string;
  ingredientDescriptor: string | null;
  isAddingToGroceries?: boolean;
  isRemovingFromList?: boolean;
  onAddToGroceries: (ingredientId: string) => void;
  onRemoveFromList: (ingredientId: string) => void;
};

export function GroceriesEditLibraryRow({
  ingredientId,
  ingredientName,
  ingredientDescriptor,
  isAddingToGroceries = false,
  isRemovingFromList = false,
  onAddToGroceries,
  onRemoveFromList,
}: GroceriesEditLibraryRowProps) {
  const descriptor = ingredientDescriptor?.trim() ?? "";

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Name + optional descriptor; truncates so long names don't push the buttons off the panel. */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{ingredientName}</div>
        {descriptor ? (
          <div className="truncate text-xs text-muted-foreground">
            {descriptor}
          </div>
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

      {/* Trash removes this ingredient from THIS library list (not from the
          grocery list and not from the global ingredients DB). */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${ingredientName} from list`}
        disabled={isRemovingFromList}
        onClick={() => onRemoveFromList(ingredientId)}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
