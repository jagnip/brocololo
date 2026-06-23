"use client";

import { useCallback, useEffect, useState } from "react";
import type { GroceriesPersistedListModel } from "@/components/groceries/groceries-persisted-list";
import { GroceriesPersistedList } from "@/components/groceries/groceries-persisted-list";
import { GroceriesDeleteListDialog } from "@/components/groceries/groceries-delete-list-dialog";
import {
  GroceriesLayoutEditDialog,
  type GroceriesLayoutEditDialogMode,
} from "@/components/groceries/groceries-layout-edit-dialog";
import { useGroceriesTopbarState } from "@/components/groceries/groceries-topbar-state-context";

type GroceriesViewShellProps = {
  list: GroceriesPersistedListModel;
  categories: Array<{ id: string; name: string }>;
};

/** Client shell for owned grocery list view: top bar handlers + layout/delete dialogs. */
export function GroceriesViewShell({ list, categories }: GroceriesViewShellProps) {
  const { setState, resetState } = useGroceriesTopbarState();
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [layoutDialogMode, setLayoutDialogMode] =
    useState<GroceriesLayoutEditDialogMode>("edit");
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openLayoutDialog = useCallback((mode: GroceriesLayoutEditDialogMode) => {
    setLayoutDialogMode(mode);
    setLayoutDialogOpen(true);
  }, []);

  const hasCustomLayouts = list.layoutPresets.some((preset) => !preset.isBuiltIn);

  useEffect(() => {
    setState({
      onEditSupermarketLayout: () => openLayoutDialog("edit"),
      onCreateSupermarketLayout: () => openLayoutDialog("create"),
      onDeleteGroceriesList: () => setDeleteListOpen(true),
      isEditSupermarketLayoutDisabled: !hasCustomLayouts,
      isDeleteDisabled: false,
      isDeleting,
    });
    return () => {
      resetState();
    };
  }, [hasCustomLayouts, isDeleting, openLayoutDialog, resetState, setState]);

  const defaultCategoryOrderIds = categories.map((category) => category.id);
  const layoutPresets = list.layoutPresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    isBuiltIn: preset.isBuiltIn,
    categoryOrderIds: preset.categoryOrderIds,
  }));

  return (
    <>
      <GroceriesPersistedList list={list} />
      <GroceriesLayoutEditDialog
        open={layoutDialogOpen}
        onOpenChange={setLayoutDialogOpen}
        mode={layoutDialogMode}
        planId={list.plan.id}
        categories={categories}
        presets={layoutPresets}
        activePresetId={list.activeLayoutPresetId}
        defaultCategoryOrderIds={defaultCategoryOrderIds}
      />
      <GroceriesDeleteListDialog
        open={deleteListOpen}
        onOpenChange={setDeleteListOpen}
        planId={list.plan.id}
        onDeletingChange={setIsDeleting}
      />
    </>
  );
}
