"use client";

import { useState, useTransition } from "react";
import { CookingPot } from "lucide-react";
import { useRouter } from "next/navigation";
import { adjustRollingMealAction, discardRollingMealQuantityAction } from "@/actions/rolling-meals-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { RollingMealQueueRow } from "@/lib/db/rolling-meals";

export function RollingMealsSection({ meals }: { meals: RollingMealQueueRow[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<{ type: "adjust" | "discard"; meal: RollingMealQueueRow } | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function open(type: "adjust" | "discard", meal: RollingMealQueueRow) {
    setSelection({ type, meal });
    setValue(String(meal.count));
    setError("");
  }

  const count = Number(value);
  const valid = selection !== null && value.trim() !== "" && Number.isInteger(count) && count >= (selection.type === "adjust" ? 0 : 1) && count <= (selection.type === "adjust" ? 99 : selection.meal.count);

  function save() {
    if (!selection || !valid) return;
    startTransition(async () => {
      try {
        const input = { entryId: selection.meal.id, expectedVersion: selection.meal.version };
        const result = selection.type === "adjust"
          ? await adjustRollingMealAction({ ...input, count })
          : await discardRollingMealQuantityAction({ ...input, quantity: count });
        if (result.type === "success") {
          setSelection(null);
          router.refresh();
        } else if (result.type === "error") {
          setError(result.message);
        } else {
          setError("This meal changed elsewhere. Close this dialog and try again.");
          router.refresh();
        }
      } catch {
        setError("Could not update this meal. Please try again.");
      }
    });
  }

  return (
    <section aria-labelledby="planned-meals-heading" className="space-y-item">
      <h2 id="planned-meals-heading" className="type-h3">Planned, not cooked</h2>
      {meals.length === 0 ? (
        <div role="status" className="flex flex-col items-center justify-center gap-comfort rounded-xl border border-dashed border-border bg-card px-empty-x py-empty-y text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
            <CookingPot />
          </div>
          <div className="space-y-cozy">
            <p className="type-h3 text-foreground">No planned meals to roll over</p>
            <p className="max-w-sm type-body-relaxed text-muted-foreground">Unfinished meals from previous plans will appear here</p>
          </div>
        </div>
      ) : (
        <ul aria-label="Planned meals" className="space-y-item">
          {meals.map((meal) => (
            <li key={meal.id} className="flex flex-col gap-comfort rounded-md border border-border bg-card p-nest transition-colors hover:bg-muted/40 focus-within:bg-muted/40 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="min-w-0 truncate font-medium" title={meal.name}>{meal.name}</p>
                <p className="mt-tight type-caption text-muted-foreground">{meal.count} {meal.count === 1 ? "meal" : "meals"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-item">
                <Button type="button" variant="outline" onClick={() => open("adjust", meal)} aria-label={`Adjust ${meal.name}`}>Adjust</Button>
                <Button type="button" variant="outline" onClick={() => open("discard", meal)} aria-label={`Discard ${meal.name}`}>Discard</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selection ? (
        <Dialog open onOpenChange={(open) => { if (!open && !pending) setSelection(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selection.type === "adjust" ? "Adjust" : "Discard"} {selection.meal.name}</DialogTitle>
              <DialogDescription>{selection.type === "adjust" ? "Adjust the number of planned meals available." : "Remove planned meals from the rolling queue."}</DialogDescription>
            </DialogHeader>
            <label className="grid gap-tight text-sm font-medium">
              {selection.type === "adjust" ? "Meals available" : "Meals"}
              <Input type="number" min={selection.type === "adjust" ? 0 : 1} max={selection.type === "adjust" ? 99 : selection.meal.count} value={value} onChange={(event) => setValue(event.target.value)} disabled={pending} />
            </label>
            {error ? <p role="alert" className="type-body text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setSelection(null)}>Cancel</Button>
              <Button type="button" variant={selection.type === "discard" ? "destructive" : "default"} disabled={!valid || pending} onClick={save}>{pending ? "Saving..." : selection.type === "adjust" ? "Save" : "Discard meals"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
