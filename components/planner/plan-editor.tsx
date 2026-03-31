"use client";

import { useCallback, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { PlanInputType, SlotSaveData, type SlotInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { deletePlanAction, generateLogFromPlan, updateSavedPlan } from "@/actions/planner-actions";
import { WeekPicker, getDefaultDateRange, type DateRangeValue } from "./date-range-picker";
import { rebasePlanSlotsByDateRangeDelta } from "@/lib/planner/plan-date-rebase";

type PlanEditorProps = {
  planId: string;
  initialPlan: PlanInputType;
  recipes: RecipeType[];
};

type SaveStatus = "idle" | "saving";

export function PlanEditor({ planId, initialPlan, recipes }: PlanEditorProps) {
  const [plan, setPlan] = useState<PlanInputType>(initialPlan);
  // Buffer that keeps shifted recipes while the editor is "dirty" (before Save).
  // `plan` is the visible subset for the currently selected date range.
  const allSlotsRef = useRef<PlanInputType>(initialPlan);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const editVersionRef = useRef(0);
  const router = useRouter();
  const [logStatus, setLogStatus] = useState<"idle" | "generating">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting">("idle");

  function formatDateKeysForToast(dateKeys: string[]) {
    // Format YYYY-MM-DD as a readable UTC date string to avoid timezone drift.
    return dateKeys.map((dateKey) =>
      new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    );
  }

  const parseUtcDateKey = (dateKey: string): Date => new Date(`${dateKey}T00:00:00.000Z`);

  function shiftPlanSlotsByUtcDayDelta(slots: PlanInputType, deltaDays: number): PlanInputType {
    // Shifting by UTC day avoids DST and timezone drift.
    return slots.map((slot) => {
      const d = new Date(slot.date);
      d.setUTCDate(d.getUTCDate() + deltaDays);
      return { ...slot, date: d };
    });
  }

  const mergeSlotsByMealKey = (base: PlanInputType, overlay: PlanInputType): PlanInputType => {
    const mealKey = (slot: SlotInputType) => `${slot.date.toISOString().slice(0, 10)}-${slot.mealType}`;

    const byKey = new Map<string, SlotInputType>();
    for (const s of base) byKey.set(mealKey(s), s);
    for (const s of overlay) byKey.set(mealKey(s), s);

    return Array.from(byKey.values());
  };

  const initialDateRange = (() => {
    // Derive picker bounds from the currently persisted plan slots.
    const keys = initialPlan.map((s) => s.date.toISOString().slice(0, 10));
    if (keys.length === 0) return getDefaultDateRange();
    const start = keys.reduce((min, k) => (k < min ? k : min), keys[0]!);
    const end = keys.reduce((max, k) => (k > max ? k : max), keys[0]!);
    return { start, end } satisfies DateRangeValue;
  })();

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    if (saveStatus === "saving") return;

    const saveEditVersion = editVersionRef.current;
    setSaveStatus("saving");

    const saveData: SlotSaveData[] = plan.map((s) => ({
      date: new Date(s.date),
      mealType: s.mealType,
      recipeId: s.recipe?.id ?? null,
      alternativeRecipeIds: s.alternatives.map((a) => a.id),
      used: s.used,
    }));

    const result = await updateSavedPlan(planId, saveData);
    if (result.type === "error") {
      setSaveStatus("idle");
      toast.error(result.message);
      return;
    }

    setSaveStatus("idle");
    if (saveEditVersion === editVersionRef.current) {
      setIsDirty(false);
      // After successful save, it's safe to drop shifted-out-of-range recipes
      // because the database persisted only the visible `plan` subset.
      allSlotsRef.current = plan;
    }
  }, [isDirty, plan, planId, saveStatus]);

  const handleDateRangeChange = useCallback(
    (next: DateRangeValue) => {
      if (next.start === dateRange.start && next.end === dateRange.end) return;

      // Treat range changes like edits: shift all buffered slots in-memory,
      // rebuild the visible subset for the new range, then keep shifted-out-of-range
      // recipes in `allSlotsRef` until Save.
      const oldStartDateKey = dateRange.start;
      const oldStart = parseUtcDateKey(oldStartDateKey);
      const newStart = parseUtcDateKey(next.start);
      const deltaDays = Math.round((newStart.getTime() - oldStart.getTime()) / (24 * 60 * 60 * 1000));

      // 1) Shift the whole buffer by the constant day delta derived from start change.
      if (deltaDays !== 0) {
        allSlotsRef.current = shiftPlanSlotsByUtcDayDelta(allSlotsRef.current, deltaDays);
      }

      // 2) Rebuild the visible subset for the chosen range.
      // We pass oldStartDateKey == newStartDateKey so helper doesn't shift again (delta=0),
      // and it only fills in missing empty meal slots for the selected days.
      const visibleRebased = rebasePlanSlotsByDateRangeDelta({
        slots: allSlotsRef.current,
        oldStartDateKey: next.start,
        newStartDateKey: next.start,
        newEndDateKey: next.end,
      });

      // 3) Keep any newly-created in-range empty slots in the buffer too,
      // while preserving out-of-range recipes until the user saves.
      allSlotsRef.current = mergeSlotsByMealKey(allSlotsRef.current, visibleRebased);

      setDateRange(next);
      setPlan(visibleRebased);

      editVersionRef.current += 1;
      setIsDirty(true);
      if (saveStatus !== "saving") {
        setSaveStatus("idle");
      }
    },
    [dateRange.start, dateRange.end, saveStatus],
  );

  function markEdited<T extends unknown[]>(fn: (...args: T) => void) {
    return (...args: T) => {
      editVersionRef.current += 1;
      setIsDirty(true);
      fn(...args);
    };
  }

  const handleShuffle = useCallback((slotKey: string) => {
    allSlotsRef.current = allSlotsRef.current.map((slot) => {
      const key = `${slot.date.toISOString()}-${slot.mealType}`;
      if (key !== slotKey || !slot.recipe || slot.alternatives.length === 0) return slot;
      const [nextRecipe, ...restAlternatives] = slot.alternatives;
      return {
        ...slot,
        recipe: nextRecipe,
        alternatives: [...restAlternatives, slot.recipe],
      };
    });

    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey || !slot.recipe || slot.alternatives.length === 0) return slot;
        const [nextRecipe, ...restAlternatives] = slot.alternatives;
        return {
          ...slot,
          recipe: nextRecipe,
          alternatives: [...restAlternatives, slot.recipe],
        };
      }),
    );
  }, []);

  const handleReplace = useCallback((slotKey: string, newRecipe: RecipeType) => {
    allSlotsRef.current = allSlotsRef.current.map((slot) => {
      const key = `${slot.date.toISOString()}-${slot.mealType}`;
      if (key !== slotKey) return slot;
      return {
        ...slot,
        recipe: newRecipe,
        alternatives: slot.alternatives.filter((r) => r.id !== newRecipe.id),
      };
    });

    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return {
          ...slot,
          recipe: newRecipe,
          alternatives: slot.alternatives.filter((r) => r.id !== newRecipe.id),
        };
      }),
    );
  }, []);

  const handleRemove = useCallback((slotKey: string) => {
    allSlotsRef.current = allSlotsRef.current.map((slot) => {
      const key = `${slot.date.toISOString()}-${slot.mealType}`;
      if (key !== slotKey) return slot;
      return { ...slot, recipe: null };
    });

    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return { ...slot, recipe: null };
      }),
    );
  }, []);

  const handleToggleUsed = useCallback((slotKey: string) => {
    allSlotsRef.current = allSlotsRef.current.map((slot) => {
      const key = `${slot.date.toISOString()}-${slot.mealType}`;
      if (key !== slotKey) return slot;
      return { ...slot, used: !slot.used };
    });

    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return { ...slot, used: !slot.used };
      }),
    );
  }, []);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Edit plan</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!isDirty || saveStatus === "saving"}
            aria-busy={saveStatus === "saving"}
            onClick={() => {
              void handleSave();
            }}
          >
            {saveStatus === "saving" ? "Saving..." : "Save"}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isDirty || saveStatus === "saving" || logStatus === "generating"}
            aria-busy={logStatus === "generating"}
            onClick={async () => {
              if (isDirty) {
                toast.info("Save your plan before generating a log.");
                return;
              }

              setLogStatus("generating");
              try {
                const result = await generateLogFromPlan(planId);
                if (result.type === "date_conflict") {
                  const formattedDates = formatDateKeysForToast(result.dates);
                  toast.info(
                    `Cannot generate log. These dates already exist in a log: ${formattedDates.join(", ")}`,
                  );
                  return;
                }
                if (result.type === "already_exists") {
                  toast.info("Log already generated for this plan.");
                  return;
                }
                if (result.type === "error") {
                  toast.error(result.message);
                  return;
                }

                router.push(ROUTES.logView(result.logId));
              } finally {
                setLogStatus("idle");
              }
            }}
          >
            {logStatus === "generating" ? "Generating log..." : "Generate log"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={saveStatus === "saving" || logStatus === "generating" || deleteStatus === "deleting"}
            onClick={async () => {
              const confirmed = window.confirm(
                "Delete this plan permanently? This cannot be undone.",
              );
              if (!confirmed) return;

              setDeleteStatus("deleting");
              try {
                const result = await deletePlanAction(planId);
                if (result.type === "error") {
                  toast.error(result.message);
                  return;
                }
                router.push(ROUTES.plan);
                router.refresh();
              } finally {
                setDeleteStatus("idle");
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            {deleteStatus === "deleting" ? "Deleting..." : "Delete plan"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <WeekPicker value={dateRange} onChange={handleDateRangeChange} />
      </div>

      <PlanView
        plan={plan}
        recipes={recipes}
        onShuffle={markEdited(handleShuffle)}
        onReplace={markEdited(handleReplace)}
        onRemove={markEdited(handleRemove)}
        onToggleUsed={markEdited(handleToggleUsed)}
      />
    </>
  );
}
