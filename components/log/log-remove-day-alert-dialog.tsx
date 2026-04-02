"use client";

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

type LogRemoveDayAlertDialogProps = {
  open: boolean;
  warning:
    | {
        impactedLogMealsCount: number;
        impactedPlanMealsCount: number;
      }
    | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function LogRemoveDayAlertDialog({
  open,
  warning,
  onOpenChange,
  onConfirm,
}: LogRemoveDayAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete day and synced plan meals?</AlertDialogTitle>
          <AlertDialogDescription>
            {warning
              ? `This will remove ${warning.impactedLogMealsCount} non-empty log meals and ${warning.impactedPlanMealsCount} planned meals for this date.`
              : "This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete day</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

