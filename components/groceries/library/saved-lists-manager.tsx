"use client";

import { TopbarConfigController } from "@/components/topbar-config";
import { GroceriesEditLibraryPanel } from "@/components/groceries/library/groceries-edit-library-panel";
import type { GroceriesEditCategoryOption, GroceriesEditIngredientOption } from "@/components/groceries/groceries-edit-types";
import type { IngredientListWithItems } from "@/lib/db/ingredient-lists";

export function SavedListsManager({
  lists,
  ingredients,
  categories,
}: {
  lists: IngredientListWithItems[];
  ingredients: GroceriesEditIngredientOption[];
  categories: GroceriesEditCategoryOption[];
}) {
  return (
    <div className="page-container space-y-6">
      <TopbarConfigController config={{ breadcrumbs: [{ label: "List library" }], actions: [] }} />
      <GroceriesEditLibraryPanel
        lists={lists}
        ingredients={ingredients}
        categories={categories}
        chrome="page"
      />
    </div>
  );
}
