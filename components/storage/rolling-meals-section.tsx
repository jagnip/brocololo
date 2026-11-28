"use client";

import { useState, useTransition } from "react";
import { CookingPot, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { adjustRollingMealAction, stopRollingMealsAction } from "@/actions/rolling-meals-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PlannedStorageMeals, PlannedStorageRow } from "@/lib/db/rolling-meals";

type Selection = { type: "adjust" | "stop"; meal: PlannedStorageRow };

function formatRange(startDate: Date, endDate: Date) {
  const format = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  return `${format.format(new Date(startDate))} - ${format.format(new Date(endDate))}`;
}

export function RollingMealsSection({ meals }: { meals: PlannedStorageMeals }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const groups = [
    { key: "latest", title: meals.latestPlan ? `From your latest plan · ${formatRange(meals.latestPlan.startDate, meals.latestPlan.endDate)}` : "From your latest plan", rows: meals.latest },
    { key: "earlier", title: "From earlier plans", rows: meals.earlier },
    { key: "unscheduled", title: "Not in a plan", rows: meals.unscheduled },
  ];
  const hasMeals = groups.some((group) => group.rows.length > 0);

  function open(type: Selection["type"], meal: PlannedStorageRow) {
    setSelection({ type, meal });
    setUnitIds(type === "stop" ? meal.unitIds : []);
    setValue(String(meal.unassignedCount));
    setError("");
  }

  const count = Number(value);
  const valid = selection !== null && (selection.type === "stop"
    ? unitIds.length > 0
    : value.trim() !== "" && Number.isInteger(count) && count >= 0 && count <= selection.meal.unassignedCount);

  function save() {
    if (!selection || !valid) return;
    startTransition(async () => {
      const input = { entryId: selection.meal.id, expectedVersion: selection.meal.version };
      const result = selection.type === "stop"
        ? await stopRollingMealsAction({ ...input, unitIds })
        : await adjustRollingMealAction({ ...input, count });
      if (result.type === "success") {
        setSelection(null);
        router.refresh();
      } else if (result.type === "error") {
        setError(result.message);
      } else {
        setError("These portions changed elsewhere. Review the updated list and try again.");
        router.refresh();
      }
    });
  }

  return <section aria-labelledby="planned-meals-heading" className="space-y-item">
    <h2 id="planned-meals-heading" className="type-h3">Planned, not cooked</h2>
    {!hasMeals ? <div role="status" className="flex flex-col items-center justify-center gap-comfort rounded-xl border border-dashed border-border bg-card px-empty-x py-empty-y text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true"><CookingPot /></div>
      <div className="space-y-cozy"><p className="type-h3 text-foreground">No pending meals</p><p className="max-w-sm type-body-relaxed text-muted-foreground">Meals you still need to cook will appear here.</p></div>
    </div> : groups.filter((group) => group.rows.length > 0).map((group) => <div key={group.key} className="space-y-item">
      <h3 className="type-body font-medium text-foreground">{group.title}</h3>
      <ul aria-label={group.title} className="space-y-item">{group.rows.map((meal) => <li key={`${group.key}:${meal.id}`} className="flex items-center gap-comfort rounded-md border border-border bg-card p-nest">
        <div className="min-w-0 flex-1"><p className="min-w-0 truncate font-medium" title={meal.name}>{meal.name}</p><p className="mt-tight type-caption text-muted-foreground">{meal.count} {meal.count === 1 ? "portion" : "portions"}</p></div>
        <div className="flex shrink-0 items-center gap-tight">
          {meal.unassignedCount > 0 ? <Button type="button" variant="outline" size="icon-sm" onClick={() => open("adjust", meal)} aria-label={`Adjust ${meal.name}`} title="Adjust unassigned portions"><Pencil className="h-4 w-4" /></Button> : null}
          <Button type="button" variant="outline" onClick={() => open("stop", meal)}>Stop rolling</Button>
        </div>
      </li>)}</ul>
    </div>)}
    {selection ? <Dialog open onOpenChange={(open) => { if (!open && !pending) setSelection(null); }}><DialogContent><DialogHeader>
      <DialogTitle>{selection.type === "stop" ? `Stop rolling ${selection.meal.name}?` : `Adjust ${selection.meal.name}`}</DialogTitle>
      <DialogDescription>{selection.type === "stop" ? "These portions will stay in your saved plan. They will not be offered in future plans." : "Only portions not in a plan can be changed here."}</DialogDescription>
    </DialogHeader>
    {selection.type === "stop" && selection.meal.unitIds.length > 1 ? <div className="space-y-tight"><label className="flex items-center gap-tight text-sm font-medium"><Checkbox checked={unitIds.length === selection.meal.unitIds.length} onCheckedChange={(checked) => setUnitIds(checked ? selection.meal.unitIds : [])} disabled={pending} />All portions</label>{selection.meal.unitIds.map((id, index) => <label key={id} className="flex items-center gap-tight text-sm"><Checkbox checked={unitIds.includes(id)} onCheckedChange={(checked) => setUnitIds((current) => checked ? [...current, id] : current.filter((value) => value !== id))} disabled={pending} />Portion {index + 1}</label>)}</div> : null}
    {selection.type === "adjust" ? <label className="grid gap-tight text-sm font-medium">Unassigned portions<Input type="number" min={0} max={selection.meal.unassignedCount} value={value} onChange={(event) => setValue(event.target.value)} disabled={pending} /></label> : null}
    {error ? <p role="alert" className="type-body text-destructive">{error}</p> : null}<DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setSelection(null)}>Cancel</Button><Button type="button" variant={selection.type === "stop" ? "outline" : "default"} disabled={!valid || pending} onClick={save}>{pending ? "Saving..." : selection.type === "stop" ? "Stop rolling" : "Save"}</Button></DialogFooter>
    </DialogContent></Dialog> : null}
  </section>;
}
