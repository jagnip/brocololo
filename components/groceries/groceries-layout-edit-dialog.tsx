"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteShoppingLayoutPresetAction,
  renameShoppingLayoutPresetAction,
  saveShoppingLayoutPresetAction,
  updateShoppingLayoutPresetAction,
} from "@/actions/shopping-list-actions";
import {
  GroceriesLayoutCategoryList,
  type GroceriesLayoutCategoryItem,
} from "@/components/groceries/groceries-layout-category-list";
import { GroceriesLayoutSwitcher } from "@/components/groceries/groceries-layout-switcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GroceriesLayoutPreset = {
  id: string;
  name: string;
  isBuiltIn: boolean;
  categoryOrderIds: string[];
};

export type GroceriesLayoutEditDialogMode = "edit" | "create";

type GroceriesLayoutEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: GroceriesLayoutEditDialogMode;
  planId: string;
  categories: GroceriesLayoutCategoryItem[];
  presets: GroceriesLayoutPreset[];
  activePresetId: string | null;
  defaultCategoryOrderIds: string[];
  onLayoutPendingChange?: (pending: boolean) => void;
  onLayoutCreated?: (preset: { id: string; name: string }) => void;
  onLayoutDeletedActive?: () => void;
};

function getPresetOrderIds(
  preset: GroceriesLayoutPreset | null | undefined,
  defaultCategoryOrderIds: string[],
) {
  if (preset?.categoryOrderIds.length) {
    return preset.categoryOrderIds;
  }
  return defaultCategoryOrderIds;
}

function getEditablePresets(presets: GroceriesLayoutPreset[]) {
  return presets.filter((preset) => !preset.isBuiltIn);
}

function getInitialEditablePreset(
  presets: GroceriesLayoutPreset[],
  activePresetId: string | null,
) {
  const editablePresets = getEditablePresets(presets);
  return (
    editablePresets.find((preset) => preset.id === activePresetId) ??
    editablePresets[0] ??
    null
  );
}

/** Dialog for creating or editing supermarket aisle layout presets. */
export function GroceriesLayoutEditDialog({
  open,
  onOpenChange,
  mode,
  planId,
  categories,
  presets,
  activePresetId,
  defaultCategoryOrderIds,
  onLayoutPendingChange,
  onLayoutCreated,
  onLayoutDeletedActive,
}: GroceriesLayoutEditDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [orderedCategoryIds, setOrderedCategoryIds] = useState<string[]>([]);
  const [layoutNameInput, setLayoutNameInput] = useState("");

  const isCreateMode = mode === "create";
  const editablePresets = getEditablePresets(presets);
  const selectedPreset =
    selectedPresetId != null
      ? (editablePresets.find((preset) => preset.id === selectedPresetId) ?? null)
      : null;
  const hasEditableLayout = Boolean(selectedPreset);
  const isLayoutNameEditable = isCreateMode || hasEditableLayout;
  const canDeleteLayout = hasEditableLayout;
  const isSaveDisabled = isPending || (!isCreateMode && !hasEditableLayout);

  const loadPresetIntoForm = useCallback(
    (preset: GroceriesLayoutPreset) => {
      setSelectedPresetId(preset.id);
      setOrderedCategoryIds(getPresetOrderIds(preset, defaultCategoryOrderIds));
      setLayoutNameInput(preset.name);
    },
    [defaultCategoryOrderIds],
  );

  const clearEditableForm = useCallback(() => {
    setSelectedPresetId(null);
    setOrderedCategoryIds(defaultCategoryOrderIds);
    setLayoutNameInput("");
  }, [defaultCategoryOrderIds]);

  const finishLayoutMutation = useCallback(
    async (shouldPulseList: boolean) => {
      if (shouldPulseList) {
        onLayoutPendingChange?.(true);
      }
      onOpenChange(false);
      await router.refresh();
      if (shouldPulseList) {
        onLayoutPendingChange?.(false);
      }
    },
    [onLayoutPendingChange, onOpenChange, router],
  );

  useEffect(() => {
    if (!open) return;
    if (isCreateMode) {
      setSelectedPresetId(null);
      setOrderedCategoryIds(defaultCategoryOrderIds);
      setLayoutNameInput("");
      return;
    }
    const initialPreset = getInitialEditablePreset(presets, activePresetId);
    if (initialPreset) {
      loadPresetIntoForm(initialPreset);
    } else {
      clearEditableForm();
    }
  }, [
    activePresetId,
    defaultCategoryOrderIds,
    isCreateMode,
    clearEditableForm,
    loadPresetIntoForm,
    open,
    presets,
  ]);

  const onPresetSelect = (presetId: string) => {
    const preset = editablePresets.find((item) => item.id === presetId);
    if (!preset) return;
    loadPresetIntoForm(preset);
  };

  const persistCreate = useCallback(
    (presetName: string) => {
      startTransition(async () => {
        const result = await saveShoppingLayoutPresetAction({
          planId,
          presetName,
          orderedCategoryIds,
        });
        if (result.type === "error") {
          toast.error(result.message);
          return;
        }
        onLayoutCreated?.({ id: result.presetId, name: presetName });
        toast.success(`Saved "${presetName}" layout.`);
        await finishLayoutMutation(true);
      });
    },
    [finishLayoutMutation, onLayoutCreated, orderedCategoryIds, planId],
  );

  const persistUpdate = useCallback(() => {
    if (!selectedPreset) return;
    const trimmedName = layoutNameInput.trim();
    if (!trimmedName) {
      toast.error("Layout name cannot be empty.");
      return;
    }

    const shouldPulseList = selectedPreset.id === activePresetId;

    startTransition(async () => {
      if (trimmedName !== selectedPreset.name) {
        const renameResult = await renameShoppingLayoutPresetAction({
          planId,
          presetId: selectedPreset.id,
          name: trimmedName,
        });
        if (renameResult.type === "error") {
          toast.error(renameResult.message);
          return;
        }
      }

      const result = await updateShoppingLayoutPresetAction({
        planId,
        presetId: selectedPreset.id,
        orderedCategoryIds,
      });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(`Saved "${trimmedName}" layout.`);
      await finishLayoutMutation(shouldPulseList);
    });
  }, [
    activePresetId,
    finishLayoutMutation,
    layoutNameInput,
    orderedCategoryIds,
    planId,
    selectedPreset,
  ]);

  const onSaveClick = () => {
    const presetName = layoutNameInput.trim();
    if (!presetName) {
      toast.error("Layout name cannot be empty.");
      return;
    }
    if (isCreateMode) {
      persistCreate(presetName);
      return;
    }
    persistUpdate();
  };

  const onDeleteLayout = () => {
    if (!selectedPreset) return;
    startTransition(async () => {
      const result = await deleteShoppingLayoutPresetAction({
        planId,
        presetId: selectedPreset.id,
      });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      if (result.wasActive) {
        onLayoutDeletedActive?.();
      }
      toast.success(
        result.wasActive
          ? `Removed "${result.deletedPresetName}" and switched to Default layout.`
          : `Removed "${result.deletedPresetName}".`,
      );
      await finishLayoutMutation(result.wasActive);
    });
  };

  const title = isCreateMode ? "Create supermarket layout" : "Edit supermarket layout";
  const description = isCreateMode
    ? "Name your layout and drag categories into the order you walk through the store."
    : editablePresets.length === 0
      ? "You don't have any custom layouts yet. Create one from the menu."
      : "Update the layout name and drag categories into your preferred order.";

  const saveButtonLabel = isCreateMode
    ? isPending
      ? "Creating…"
      : "Create layout"
    : isPending
      ? "Saving…"
      : "Save layout";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {!isCreateMode && editablePresets.length > 0 ? (
            <div className="space-y-2">
              <Label>Select layout</Label>
              <GroceriesLayoutSwitcher
                presets={editablePresets}
                activePresetId={selectedPresetId}
                onPresetChange={onPresetSelect}
                disabled={isPending}
                fallbackToFirstPreset={false}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="layout-name-input">Layout name</Label>
            <Input
              id="layout-name-input"
              value={layoutNameInput}
              onChange={(event) => setLayoutNameInput(event.target.value)}
              placeholder={isLayoutNameEditable ? "e.g. Weekend shop" : undefined}
              disabled={isPending || !isLayoutNameEditable}
              readOnly={!isLayoutNameEditable}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSaveClick();
                }
              }}
            />
          </div>

          <div className="min-h-[min(50vh,420px)]">
            <GroceriesLayoutCategoryList
              categories={categories}
              orderedCategoryIds={orderedCategoryIds}
              onOrderChange={setOrderedCategoryIds}
              disabled={isPending || (!isCreateMode && !hasEditableLayout)}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
          {!isCreateMode && canDeleteLayout ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onDeleteLayout}
              disabled={isPending}
            >
              Delete layout
            </Button>
          ) : (
            <span />
          )}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onSaveClick} disabled={isSaveDisabled}>
              {saveButtonLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
