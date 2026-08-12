"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  PlanSlotMealForm,
  type PlanSlotMealFormProps,
} from "./plan-slot-meal-form";

type PlanSlotMealDialogProps = PlanSlotMealFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PlanSlotMealDialog({
  open,
  onOpenChange,
  onCancel,
  initialRecipeId,
  initialCustomName,
  defaultTab = "repository",
  cookingFamilyMemberIds = [],
  ...formProps
}: PlanSlotMealDialogProps) {
  // Remount the form when the dialog opens or the slot/initials change so
  // draft state reseeds from props without a sync effect.
  const formKey = [
    open ? "open" : "closed",
    defaultTab,
    initialRecipeId ?? "none",
    initialCustomName,
    cookingFamilyMemberIds.join(","),
  ].join("|");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(1000px,calc(100vw-3rem))] sm:max-w-[1000px] lg:w-[min(1200px,calc(100vw-4rem))] lg:max-w-[1200px] xl:w-[min(1400px,calc(100vw-5rem))] xl:max-w-[1400px]"
      >
        <PlanSlotMealForm
          key={formKey}
          initialRecipeId={initialRecipeId}
          initialCustomName={initialCustomName}
          defaultTab={defaultTab}
          cookingFamilyMemberIds={cookingFamilyMemberIds}
          {...formProps}
          onCancel={() => {
            onCancel();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
