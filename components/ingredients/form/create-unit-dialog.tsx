"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { createUnitInlineAction } from "@/actions/unit-actions";
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
import type { UnitType } from "@/types/unit";

type CreateUnitDialogProps = {
  open: boolean;
  unitName: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (unit: UnitType) => void;
};

export function CreateUnitDialog({
  open,
  unitName,
  onOpenChange,
  onCreated,
}: CreateUnitDialogProps) {
  const [isCreating, startCreateTransition] = useTransition();
  const normalizedUnitName = unitName.trim();
  const pluralInputRef = useRef<HTMLInputElement | null>(null);

  function onConfirmCreate() {
    if (!normalizedUnitName) {
      return;
    }
    const normalizedUnitPlural = pluralInputRef.current?.value?.trim() || undefined;

    startCreateTransition(async () => {
      const result = await createUnitInlineAction({
        name: normalizedUnitName,
        namePlural: normalizedUnitPlural,
      });
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }

      onCreated(result.unit);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new unit?</DialogTitle>
          <DialogDescription>
            You are about to create <strong>{normalizedUnitName}</strong> as a new unit.
            Continue?
          </DialogDescription>
        </DialogHeader>
        {/* Optional plural input supports irregular nouns like piece -> pieces. */}
        <Input
          key={normalizedUnitName}
          ref={pluralInputRef}
          placeholder="Plural (optional), e.g. pieces"
          disabled={isCreating}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isCreating}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {/* Keep confirmation explicit so accidental submits do not create units. */}
          <Button type="button" disabled={isCreating} onClick={onConfirmCreate}>
            {isCreating ? "Creating..." : `Create "${normalizedUnitName}"`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
