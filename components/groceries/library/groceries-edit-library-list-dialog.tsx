"use client";

import { useEffect, useState } from "react";
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

// One dialog component shared between "create" and "rename" because the
// surface (single input + confirm/cancel) is identical. The parent passes a
// title/description and an `initialName` (empty for create, current for rename),
// then `onConfirm` returns a promise so the dialog can show a pending state.
type GroceriesEditLibraryListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  initialName?: string;
  onConfirm: (nextName: string) => Promise<void> | void;
};

export function GroceriesEditLibraryListDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  initialName = "",
  onConfirm,
}: GroceriesEditLibraryListDialogProps) {
  const [name, setName] = useState(initialName);
  const [isPending, setIsPending] = useState(false);

  // Sync the local input back to `initialName` whenever the dialog reopens
  // for a different list (or for a fresh create).
  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  const trimmed = name.trim();
  const canConfirm = trimmed.length > 0 && !isPending;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsPending(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="ingredient-list-name-input">List name</Label>
          <Input
            id="ingredient-list-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Weekly staples"
            maxLength={60}
            autoFocus
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void handleConfirm();
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
