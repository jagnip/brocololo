"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  RecipeAddToLogForm,
  type EditLogIngredientsDialogProps,
} from "./add-to-log-form";

/** Modal shell around `RecipeAddToLogForm` for the recipe page “add to log” flow. */
export function RecipeAddToLogDialog({
  open,
  onOpenChange,
  ...formProps
}: EditLogIngredientsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[min(1000px,calc(100vw-3rem))] sm:max-w-[1000px] lg:w-[min(1200px,calc(100vw-4rem))] lg:max-w-[1200px] xl:w-[min(1400px,calc(100vw-5rem))] xl:max-w-[1400px] 2xl:w-[min(1600px,calc(100vw-6rem))] 2xl:max-w-[1600px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col"
      >
        <RecipeAddToLogForm
          {...formProps}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
