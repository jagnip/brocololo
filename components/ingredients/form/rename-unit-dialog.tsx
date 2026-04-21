"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { renameUnitInlineAction } from "@/actions/unit-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UnitType } from "@/types/unit";

type RenameUnitDialogProps = {
  open: boolean;
  unit: UnitType | null;
  onOpenChange: (open: boolean) => void;
  onRenamed: (unit: UnitType) => void;
};

export function RenameUnitDialog({
  open,
  unit,
  onOpenChange,
  onRenamed,
}: RenameUnitDialogProps) {
  const [isRenaming, startRenameTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const pluralInputRef = useRef<HTMLInputElement | null>(null);

  function onConfirmRename() {
    if (!unit) {
      return;
    }

    const nextName = nameInputRef.current?.value ?? "";
    const nextPlural = pluralInputRef.current?.value?.trim() || undefined;

    startRenameTransition(async () => {
      const result = await renameUnitInlineAction({
        unitId: unit.id,
        name: nextName,
        namePlural: nextPlural,
      });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }

      onRenamed(result.unit);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename unit</DialogTitle>
          <DialogDescription>
            Change this unit name globally for all ingredient references.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Singular name</Label>
          <Input
            key={unit?.id ?? "unit-rename-input"}
            defaultValue={unit?.name ?? ""}
            ref={nameInputRef}
            placeholder="Enter singular name, e.g. piece"
            disabled={isRenaming}
          />
        </div>
        {/* Optional plural keeps unit wording correct for amounts > 1. */}
        <div className="space-y-2">
          <Label>Plural name (optional)</Label>
          <Input
            key={`${unit?.id ?? "unit-rename-input"}-plural`}
            defaultValue={unit?.namePlural ?? ""}
            ref={pluralInputRef}
            placeholder="Enter plural, e.g. pieces"
            disabled={isRenaming}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isRenaming}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {/* Keep rename confirmation explicit for global label updates. */}
          <Button type="button" disabled={isRenaming} onClick={onConfirmRename}>
            {isRenaming ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
