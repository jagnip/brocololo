"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PlanInputType, SlotSaveData, type SlotInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { deletePlanAction, generateLogFromPlan, updateSavedPlan } from "@/actions/planner-actions";
import { WeekPicker, getDefaultDateRange, type DateRangeValue } from "./date-range-picker";
import { rebasePlanSlotsByDateRangeDelta } from "@/lib/planner/plan-date-rebase";
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
import { usePlanTopbarState } from "@/components/planner/plan-topbar-state-context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

type PlanEditorProps = {
  planId: string;
  initialPlan: PlanInputType;
  recipes: RecipeType[];
};

type SaveStatus = "idle" | "saving";
type SyncConflictState = {
  impactedDates: string[];
  impactedLogMealsCount: number;
  impactedPlanMealsCount: number;
  saveData: SlotSaveData[];
};

export function PlanEditor({ planId, initialPlan, recipes }: PlanEditorProps) {
  const AUTOSAVE_DELAY_MS = 1000;
  const [plan, setPlan] = useState<PlanInputType>(initialPlan);
  const allSlotsRef = useRef<PlanInputType>(initialPlan);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const editVersionRef = useRef(0);
  const router = useRouter();
  const [logStatus, setLogStatus] = useState<"idle" | "generating">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting">("idle");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [syncConflict, setSyncConflict] = useState<SyncConflictState | null>(null);
  const blockedAutosaveVersionRef = useRef<number | null>(null);
  const { setState: setPlanTopbarState, resetState: resetPlanTopbarState } = usePlanTopbarState();

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
    if (result.type === "date_conflict") {
      setSaveStatus("idle");
      // Avoid retry-toasts in a loop: wait for a new user edit before autosave retries.
      blockedAutosaveVersionRef.current = saveEditVersion;
      // Surface blocked extension dates so user can pick a non-colliding range.
      toast.error(
        `Cannot save. Date conflict: ${formatDateKeysForToast(result.dates).join(", ")}`,
      );
      return;
    }
    if (result.type === "sync_conflict") {
      setSaveStatus("idle");
      setSyncConflict({
        impactedDates: result.impactedDates,
        impactedLogMealsCount: result.impactedLogMealsCount,
        impactedPlanMealsCount: result.impactedPlanMealsCount,
        saveData,
      });
      return;
    }
    if (result.type === "error") {
      setSaveStatus("idle");
      toast.error(result.message);
      return;
    }

    setSaveStatus("idle");
    if (saveEditVersion === editVersionRef.current) {
      blockedAutosaveVersionRef.current = null;
      setIsDirty(false);
      // After successful save, it's safe to drop shifted-out-of-range recipes
      // because the database persisted only the visible `plan` subset.
      allSlotsRef.current = plan;
    }
  }, [isDirty, plan, planId, saveStatus]);

  useEffect(() => {
    // Debounced autosave reuses the existing save pipeline and conflict handling.
    if (!isDirty || saveStatus === "saving" || syncConflict != null) {
      return;
    }
    // If latest attempt hit date conflict, wait for a new edit before retrying.
    if (blockedAutosaveVersionRef.current === editVersionRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      void handleSave();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [AUTOSAVE_DELAY_MS, handleSave, isDirty, saveStatus, syncConflict]);

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

  const handleGenerateLog = useCallback(async () => {
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
  }, [isDirty, planId, router]);

  useEffect(() => {
    // Keep plan topbar action state in sync with editor runtime state.
    setPlanTopbarState({
      isGenerateDisabled: isDirty || saveStatus === "saving" || logStatus === "generating",
      isGenerating: logStatus === "generating",
      isDeleteDisabled:
        saveStatus === "saving" || logStatus === "generating" || deleteStatus === "deleting",
      isDeleting: deleteStatus === "deleting",
      onGenerateLog: () => void handleGenerateLog(),
      onDeletePlan: () => setIsDeleteDialogOpen(true),
    });

    return () => {
      resetPlanTopbarState();
    };
  }, [
    deleteStatus,
    handleGenerateLog,
    isDirty,
    logStatus,
    resetPlanTopbarState,
    saveStatus,
    setPlanTopbarState,
  ]);

  return (
    <>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDeleteStatus("deleting");
                void (async () => {
                  try {
                    const result = await deletePlanAction(planId);
                    if (result.type === "error") {
                      toast.error(result.message);
                      return;
                    }
                    router.push(ROUTES.planCurrent);
                    router.refresh();
                  } finally {
                    setDeleteStatus("idle");
                    setIsDeleteDialogOpen(false);
                  }
                })();
              }}
            >
              Delete plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={syncConflict != null}
        onOpenChange={(open) => {
          if (!open) {
            setSyncConflict(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync will remove existing meals</AlertDialogTitle>
            <AlertDialogDescription>
              {syncConflict
                ? `This update removes ${syncConflict.impactedLogMealsCount} non-empty log meals and ${syncConflict.impactedPlanMealsCount} planned meals across ${syncConflict.impactedDates.length} day(s).`
                : "This update will remove meals."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!syncConflict) {
                  return;
                }
                setSaveStatus("saving");
                void (async () => {
                  const forcedResult = await updateSavedPlan(
                    planId,
                    syncConflict.saveData,
                    { forceDestructiveSync: true },
                  );
                  if (forcedResult.type === "error") {
                    toast.error(forcedResult.message);
                    setSaveStatus("idle");
                    return;
                  }
                  if (forcedResult.type === "date_conflict") {
                    toast.error(
                      `Cannot save. Date conflict: ${formatDateKeysForToast(forcedResult.dates).join(", ")}`,
                    );
                    setSaveStatus("idle");
                    return;
                  }
                  if (forcedResult.type === "sync_conflict") {
                    setSyncConflict({
                      impactedDates: forcedResult.impactedDates,
                      impactedLogMealsCount: forcedResult.impactedLogMealsCount,
                      impactedPlanMealsCount: forcedResult.impactedPlanMealsCount,
                      saveData: syncConflict.saveData,
                    });
                    setSaveStatus("idle");
                    return;
                  }
                  setSyncConflict(null);
                  setSaveStatus("idle");
                  setIsDirty(false);
                  allSlotsRef.current = plan;
                })();
              }}
            >
              Save and sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <PageHeader title="Plan details" />
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-2">
          <div className="flex min-w-0 flex-nowrap items-center gap-1.5 md:flex-wrap md:gap-2">
            <div className="min-w-0 flex-1 md:flex-none md:w-80">
              <WeekPicker
                value={dateRange}
                onChange={handleDateRangeChange}
                compact
                className="w-full"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isDirty || saveStatus === "saving" || logStatus === "generating"}
              aria-busy={logStatus === "generating"}
              onClick={() => {
                void handleGenerateLog();
              }}
            >
              {logStatus === "generating" ? "Generating log..." : "Generate log"}
            </Button>
          </div>

          {saveStatus === "saving" ? (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-label="Saving plan"
            />
          ) : null}
        </div>
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
