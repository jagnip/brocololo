"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adjustStoredMealLotAction, removeStoredMealQuantityAction } from "@/actions/storage-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { StoredMealLotRow } from "@/lib/db/storage";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type StorageListProps = {
  lots: StoredMealLotRow[];
  familyMembers: FamilyMemberRow[];
};

type DialogState =
  | { type: "adjust"; lot: StoredMealLotRow }
  | { type: "remove"; lot: StoredMealLotRow }
  | null;

const cookedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function StorageList({ lots, familyMembers }: StorageListProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [isPending, startTransition] = useTransition();

  const closeDialog = () => {
    if (!isPending) setDialog(null);
  };

  const remove = (lot: StoredMealLotRow, quantity: number) => {
    startTransition(async () => {
      const result = await removeStoredMealQuantityAction({
        lotId: lot.id,
        expectedVersion: lot.version,
        quantity,
        reason: "DISCARDED",
      });
      if (result.type === "success") {
        toast.success("Meal discarded.");
        setDialog(null);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <section aria-labelledby="stored-meals-heading" className="space-y-item">
      <h2 id="stored-meals-heading" className="type-h3">Cooked and stored</h2>
      {lots.length === 0 ? (
        <p className="type-body text-muted-foreground">No cooked meals in storage.</p>
      ) : (
      <ul className="space-y-item" aria-label="Stored meals">
        {lots.map((lot) => {
          const audience = lot.audience.map((member) => member.name).join(", ");
          return (
            <li key={lot.id} className="flex flex-col gap-comfort rounded-md border border-border bg-card p-nest transition-colors hover:bg-muted/40 focus-within:bg-muted/40 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="min-w-0 truncate font-medium" title={lot.recipe.name}>{lot.recipe.name}</p>
                <p className="mt-tight type-caption text-muted-foreground">
                  {lot.count} {lot.count === 1 ? "meal" : "meals"} · {cookedDateFormatter.format(lot.cookedAt)} · for {audience || "your household"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-item">
                <Button type="button" variant="outline" onClick={() => setDialog({ type: "adjust", lot })} aria-label={`Adjust ${lot.recipe.name}`}>Adjust</Button>
                <Button type="button" variant="outline" onClick={() => setDialog({ type: "remove", lot })} aria-label={`Discard ${lot.recipe.name}`}>Discard</Button>
              </div>
            </li>
          );
        })}
      </ul>
      )}
      {dialog?.type === "adjust" ? (
        <AdjustDialog dialog={dialog} familyMembers={familyMembers} onClose={closeDialog} />
      ) : null}
      {dialog?.type === "remove" ? (
        <RemoveDialog dialog={dialog} isPending={isPending} onClose={closeDialog} onConfirm={remove} />
      ) : null}
    </section>
  );
}

function AdjustDialog({ dialog, familyMembers, onClose }: {
  dialog: Extract<DialogState, { type: "adjust" }>;
  familyMembers: FamilyMemberRow[];
  onClose: () => void;
}) {
  const [count, setCount] = useState(String(dialog.lot.count));
  const [audienceIds, setAudienceIds] = useState(() => dialog.lot.audience.map((member) => member.id));
  const [isPending, startTransition] = useTransition();
  const parsedCount = Number(count);
  const isValid = count.trim() !== "" && Number.isInteger(parsedCount) && parsedCount >= 0 && parsedCount <= 99 && audienceIds.length > 0;

  const save = () => {
    if (!isValid) return;
    startTransition(async () => {
      const result = await adjustStoredMealLotAction({
        lotId: dialog.lot.id,
        expectedVersion: dialog.lot.version,
        count: parsedCount,
        cookingFamilyMemberIds: audienceIds,
      });
      if (result.type === "success") {
        toast.success("Storage updated.");
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {dialog.lot.recipe.name}</DialogTitle>
          <DialogDescription>Adjust the number of cooked meals and who they are for.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-tight text-sm font-medium">
          Meals available
          <Input type="number" min={0} max={99} value={count} onChange={(event) => setCount(event.target.value)} disabled={isPending} />
        </label>
        <fieldset className="grid gap-item">
          <legend className="text-sm font-medium">Cooked for</legend>
          {familyMembers.map((member) => (
            <label key={member.id} className="flex items-center gap-item text-sm">
              <Checkbox checked={audienceIds.includes(member.id)} disabled={isPending} onCheckedChange={(checked) => setAudienceIds((current) => checked === true ? [...new Set([...current, member.id])] : current.filter((id) => id !== member.id))} />
              {member.name || "Unnamed person"}
            </label>
          ))}
        </fieldset>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!isValid || isPending}>{isPending ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ dialog, isPending, onClose, onConfirm }: {
  dialog: Extract<DialogState, { type: "remove" }>;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (lot: StoredMealLotRow, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const parsedQuantity = Number(quantity);
  const isValid = Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= dialog.lot.count;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard {dialog.lot.recipe.name}</DialogTitle>
          <DialogDescription>
            This records meals that are no longer available.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-tight text-sm font-medium">
          Meals
          <Input type="number" min={1} max={dialog.lot.count} value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={isPending} />
        </label>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => onConfirm(dialog.lot, parsedQuantity)} disabled={!isValid || isPending}>
            {isPending ? "Saving..." : "Discard meals"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
