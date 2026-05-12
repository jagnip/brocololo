"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addIngredientToListAction,
  createIngredientListAction,
  deleteIngredientListAction,
  removeIngredientFromListAction,
  renameIngredientListAction,
} from "@/actions/ingredient-list-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  buildIngredientSearchSourceMap,
  ingredientsToSearchableSelectOptions,
  renderIngredientSearchDropdownLabel,
  renderIngredientSearchTriggerLabel,
} from "@/components/ingredients/ingredient-searchable-select-labels";
import type {
  GroceriesEditCategoryOption,
  GroceriesEditIngredientOption,
} from "@/components/groceries/groceries-edit-types";
import type { IngredientListWithItems } from "@/lib/db/ingredient-lists";
import { GroceriesEditLibraryListDialog } from "@/components/groceries/library/groceries-edit-library-list-dialog";
import { GroceriesEditLibraryRow } from "@/components/groceries/library/groceries-edit-library-row";
import { cn } from "@/lib/utils";

// The panel needs `planId` purely so the server actions can revalidate the
// groceries edit page that's currently open. Library data itself is global.
type GroceriesEditLibraryPanelProps = {
  planId: string;
  lists: IngredientListWithItems[];
  ingredients: GroceriesEditIngredientOption[];
  categories: GroceriesEditCategoryOption[];
  onAddIngredientToGroceries: (ingredientId: string) => void;
  className?: string;
};

// Local mirror of the active list's ingredient ids so add/remove feel instant.
// We keep ids in a Set keyed by listId so switching between lists doesn't lose
// pending optimistic state for either side.
type OptimisticByList = Map<string, Set<string>>;

function buildOptimisticState(lists: IngredientListWithItems[]): OptimisticByList {
  const map: OptimisticByList = new Map();
  for (const list of lists) {
    map.set(list.id, new Set(list.items.map((item) => item.ingredientId)));
  }
  return map;
}

export function GroceriesEditLibraryPanel({
  planId,
  lists,
  ingredients,
  categories,
  onAddIngredientToGroceries,
  className,
}: GroceriesEditLibraryPanelProps) {
  const [, startTransition] = useTransition();
  const [activeListId, setActiveListId] = useState<string | null>(
    lists[0]?.id ?? null,
  );
  const [optimisticByList, setOptimisticByList] = useState<OptimisticByList>(() =>
    buildOptimisticState(lists),
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Whenever the server-fetched lists change (after revalidatePath), reset the
  // optimistic mirror and make sure the active list still exists. If the
  // current active list was deleted, fall back to the first remaining list.
  useEffect(() => {
    setOptimisticByList(buildOptimisticState(lists));
    setActiveListId((prev) => {
      if (prev && lists.some((list) => list.id === prev)) return prev;
      return lists[0]?.id ?? null;
    });
  }, [lists]);

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) ?? null,
    [lists, activeListId],
  );
  const activeIngredientIds = useMemo(
    () => optimisticByList.get(activeListId ?? "") ?? new Set<string>(),
    [optimisticByList, activeListId],
  );

  // Quick lookup so we can hydrate optimistic ingredient ids back to full
  // ingredient records (with category, descriptor, etc.) for rendering.
  const ingredientById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );

  // SearchableSelect options for the "search and add" combobox (whole DB).
  const ingredientSearchOptions = useMemo<SearchableSelectOption[]>(
    () =>
      ingredientsToSearchableSelectOptions(
        ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          brand: ingredient.brand,
          descriptor: ingredient.descriptor,
          icon: ingredient.icon,
          category: ingredient.category,
        })),
      ),
    [ingredients],
  );
  const ingredientLabelLookup = useMemo(
    () =>
      buildIngredientSearchSourceMap(
        ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          brand: ingredient.brand,
          descriptor: ingredient.descriptor,
          icon: ingredient.icon,
          category: ingredient.category,
        })),
      ),
    [ingredients],
  );

  // Group the active list's ingredients by category. We always iterate
  // `categories` (sorted by sortOrder) so the panel order matches the main
  // grocery list, and we hide categories that have no items in this list.
  const groupedActiveItems = useMemo(() => {
    if (!activeList) return [];
    const ingredientsInList = [...activeIngredientIds]
      .map((ingredientId) => ingredientById.get(ingredientId))
      .filter(
        (ingredient): ingredient is GroceriesEditIngredientOption =>
          Boolean(ingredient),
      );
    return categories
      .map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        items: ingredientsInList
          .filter((ingredient) => ingredient.category.id === category.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((section) => section.items.length > 0);
  }, [activeList, activeIngredientIds, categories, ingredientById]);

  // ---------- mutation handlers ----------

  const handleCreateList = useCallback(
    async (name: string) => {
      const result = await createIngredientListAction({ planId, name });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`Created list "${name}".`);
      setCreateDialogOpen(false);
      // Pre-select the new list once revalidation lands. We can't read the
      // new id from `lists` synchronously, so the activeListId update is
      // handled by the props-sync useEffect once the new list arrives.
      setActiveListId(result.listId);
    },
    [planId],
  );

  const handleRenameList = useCallback(
    async (name: string) => {
      if (!activeList) return;
      const result = await renameIngredientListAction({
        planId,
        listId: activeList.id,
        name,
      });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`Renamed list to "${name}".`);
      setRenameDialogOpen(false);
    },
    [planId, activeList],
  );

  const handleDeleteList = useCallback(() => {
    if (!activeList) return;
    const deletedName = activeList.name;
    startTransition(async () => {
      const result = await deleteIngredientListAction({
        planId,
        listId: activeList.id,
      });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`Deleted list "${deletedName}".`);
      setDeleteDialogOpen(false);
    });
  }, [planId, activeList, startTransition]);

  const handleAddIngredientToList = useCallback(
    (ingredientId: string) => {
      if (!activeList) return;
      const listId = activeList.id;
      // Optimistic add. Roll back on error so the UI matches the server.
      setOptimisticByList((prev) => {
        const next = new Map(prev);
        const ids = new Set(next.get(listId) ?? new Set<string>());
        ids.add(ingredientId);
        next.set(listId, ids);
        return next;
      });

      startTransition(async () => {
        const result = await addIngredientToListAction({
          planId,
          listId,
          ingredientId,
        });
        if (result.type === "error") {
          toast.error(result.message);
          setOptimisticByList((prev) => {
            const next = new Map(prev);
            const ids = new Set(next.get(listId) ?? new Set<string>());
            ids.delete(ingredientId);
            next.set(listId, ids);
            return next;
          });
        }
      });
    },
    [planId, activeList, startTransition],
  );

  const handleRemoveIngredientFromList = useCallback(
    (ingredientId: string) => {
      if (!activeList) return;
      const listId = activeList.id;
      // Optimistic remove. Restore on error.
      setOptimisticByList((prev) => {
        const next = new Map(prev);
        const ids = new Set(next.get(listId) ?? new Set<string>());
        ids.delete(ingredientId);
        next.set(listId, ids);
        return next;
      });

      startTransition(async () => {
        const result = await removeIngredientFromListAction({
          planId,
          listId,
          ingredientId,
        });
        if (result.type === "error") {
          toast.error(result.message);
          setOptimisticByList((prev) => {
            const next = new Map(prev);
            const ids = new Set(next.get(listId) ?? new Set<string>());
            ids.add(ingredientId);
            next.set(listId, ids);
            return next;
          });
        }
      });
    },
    [planId, activeList, startTransition],
  );

  // ---------- rendering ----------

  return (
    <aside
      className={cn(
        "rounded-xl border bg-card p-4",
        // Sticky right column matches the previous placeholder behavior so
        // long grocery lists don't push the panel out of view.
        "xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto",
        className,
      )}
      aria-label="Ingredient lists library"
    >
      <div className="space-y-4">
        {/* Header: title + create-list button. */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Lists</h2>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Create new list"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {lists.length === 0 ? (
          // Empty-library state: nudge the user to create their first list.
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
            <p className="text-sm font-medium">No lists yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a list to save ingredients you add often.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Create your first list
            </Button>
          </div>
        ) : (
          <>
            {/* Switcher + active-list management buttons. */}
            <div className="flex items-center gap-2">
              <Select
                value={activeListId ?? undefined}
                onValueChange={(value) => setActiveListId(value)}
                allowInlineClear={false}
              >
                <SelectTrigger className="min-w-0 flex-1">
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Rename list"
                disabled={!activeList}
                onClick={() => setRenameDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Delete list"
                disabled={!activeList}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            {/* Search-to-add ingredient combobox. Pulls from the entire
                ingredients DB (passed in by the page) and dispatches an
                add-to-list server action when a user picks one. */}
            <SearchableSelect
              options={ingredientSearchOptions}
              value={null}
              onValueChange={(nextIngredientId) => {
                if (!nextIngredientId) return;
                handleAddIngredientToList(nextIngredientId);
              }}
              placeholder="Search ingredients..."
              searchPlaceholder="Search ingredients..."
              emptyLabel="No ingredient found."
              allowClear={false}
              disabled={!activeList}
              renderLabel={(option) =>
                renderIngredientSearchDropdownLabel(option, ingredientLabelLookup)
              }
              renderTriggerLabel={(option) =>
                renderIngredientSearchTriggerLabel(option, ingredientLabelLookup)
              }
            />

            {/* Body: ingredients in the active list, grouped by category. */}
            {groupedActiveItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Add ingredients from the search above to populate this list.
              </p>
            ) : (
              <div className="space-y-4">
                {groupedActiveItems.map((section) => (
                  <div key={section.categoryId} className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.categoryName}
                    </h3>
                    <ul className="divide-y divide-border/60">
                      {section.items.map((ingredient) => (
                        <li key={ingredient.id}>
                          <GroceriesEditLibraryRow
                            ingredientId={ingredient.id}
                            ingredientName={ingredient.name}
                            ingredientDescriptor={ingredient.descriptor}
                            onAddToGroceries={onAddIngredientToGroceries}
                            onRemoveFromList={handleRemoveIngredientFromList}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create dialog reuses the shared name dialog with empty `initialName`. */}
      <GroceriesEditLibraryListDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Create list"
        description="Lists let you quickly add ingredients you use often to a grocery list."
        confirmLabel="Create list"
        initialName=""
        onConfirm={handleCreateList}
      />

      {/* Rename dialog seeds the input with the active list's current name. */}
      <GroceriesEditLibraryListDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        title="Rename list"
        description="Choose a new name for this list."
        confirmLabel="Rename list"
        initialName={activeList?.name ?? ""}
        onConfirm={handleRenameList}
      />

      {/* Delete uses AlertDialog (destructive) so the confirm step is explicit. */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete list{activeList ? ` "${activeList.name}"` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the list and its saved ingredients. Ingredients
              themselves and any rows already in your grocery list are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteList}>
              Delete list
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
