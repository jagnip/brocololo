"use client";

import { useCallback, useEffect, useMemo, useOptimistic, useState } from "react";
import type { GroceriesPersistedListModel } from "@/components/groceries/groceries-persisted-list";
import { GroceriesPersistedList } from "@/components/groceries/groceries-persisted-list";
import { GroceriesDeleteListDialog } from "@/components/groceries/groceries-delete-list-dialog";
import {
  GroceriesLayoutEditDialog,
  type GroceriesLayoutEditDialogMode,
} from "@/components/groceries/groceries-layout-edit-dialog";
import type { GroceriesLayoutSwitcherPreset } from "@/components/groceries/groceries-layout-switcher";
import { useGroceriesTopbarState } from "@/components/groceries/groceries-topbar-state-context";

type GroceriesViewShellProps = {
  list: GroceriesPersistedListModel;
  categories: Array<{ id: string; name: string }>;
};

type OptimisticPresetAction = {
  type: "add";
  preset: GroceriesLayoutSwitcherPreset;
};

/** Client shell for owned grocery list view: top bar handlers + layout/delete dialogs. */
export function GroceriesViewShell({ list, categories }: GroceriesViewShellProps) {
  const { setState, resetState } = useGroceriesTopbarState();
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [layoutDialogMode, setLayoutDialogMode] =
    useState<GroceriesLayoutEditDialogMode>("edit");
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogLayoutPending, setIsDialogLayoutPending] = useState(false);
  const [isSwitchLayoutPending, setIsSwitchLayoutPending] = useState(false);

  const baseLayoutPresets = useMemo(
    () =>
      list.layoutPresets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        isBuiltIn: preset.isBuiltIn,
      })),
    [list.layoutPresets],
  );

  const [optimisticLayoutPresets, addOptimisticLayoutPreset] = useOptimistic(
    baseLayoutPresets,
    (state, action: OptimisticPresetAction) => {
      if (state.some((preset) => preset.id === action.preset.id)) {
        return state;
      }
      return [...state, action.preset];
    },
  );

  const [optimisticActivePresetId, setOptimisticActivePresetId] = useOptimistic(
    list.activeLayoutPresetId,
    (_state, presetId: string) => presetId,
  );

  const isLayoutPending = isDialogLayoutPending || isSwitchLayoutPending;

  const openLayoutDialog = useCallback((mode: GroceriesLayoutEditDialogMode) => {
    setLayoutDialogMode(mode);
    setLayoutDialogOpen(true);
  }, []);

  const hasCustomLayouts = list.layoutPresets.some((preset) => !preset.isBuiltIn);

  const onLayoutCreated = useCallback(
    (preset: { id: string; name: string }) => {
      addOptimisticLayoutPreset({
        type: "add",
        preset: { id: preset.id, name: preset.name, isBuiltIn: false },
      });
      setOptimisticActivePresetId(preset.id);
    },
    [addOptimisticLayoutPreset, setOptimisticActivePresetId],
  );

  const onLayoutDeletedActive = useCallback(() => {
    const defaultPreset = baseLayoutPresets.find((preset) => preset.isBuiltIn);
    if (defaultPreset) {
      setOptimisticActivePresetId(defaultPreset.id);
    }
  }, [baseLayoutPresets, setOptimisticActivePresetId]);

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
      <GroceriesPersistedList
        list={list}
        isLayoutPending={isLayoutPending}
        onLayoutSwitchPendingChange={setIsSwitchLayoutPending}
        layoutPresets={optimisticLayoutPresets}
        activeLayoutPresetId={optimisticActivePresetId}
      />
      <GroceriesLayoutEditDialog
        open={layoutDialogOpen}
        onOpenChange={setLayoutDialogOpen}
        mode={layoutDialogMode}
        planId={list.plan.id}
        categories={categories}
        presets={layoutPresets}
        activePresetId={list.activeLayoutPresetId}
        defaultCategoryOrderIds={defaultCategoryOrderIds}
        onLayoutPendingChange={setIsDialogLayoutPending}
        onLayoutCreated={onLayoutCreated}
        onLayoutDeletedActive={onLayoutDeletedActive}
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
