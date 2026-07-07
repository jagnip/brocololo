"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PlanInputType, PlanSlotMealPayload, SlotSaveData, type SlotInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { deletePlanAction, generateLogFromPlan, updateSavedPlan } from "@/actions/planner-actions";
import { WeekPicker, getDefaultDateRange, type DateRangeValue } from "./date-range-picker";
import { rebasePlanWithMealRescue } from "@/lib/planner/plan-range-rescue";
import {
  formatMovedMealsToast,
  formatRangeChangeDialogDescription,
  formatRangeChangeDialogTitle,
} from "@/lib/planner/planner-range-messages";
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
import { PageHeader } from "@/components/page-header";
import { usePlanTopbarState } from "@/components/planner/plan-topbar-state-context";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type PlanEditorProps = {
  planId: string;
  initialPlan: PlanInputType;
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  familyMembers?: FamilyMemberRow[];
  sharedDateRange?: DateRangeValue;
  hideInlineControls?: boolean;
  hidePageHeader?: boolean;
  disableDeleteDialog?: boolean;
  /** Embedded shell shows save progress next to tabs instead of inline. */
  onSaveStatusChange?: (isSaving: boolean) => void;
};

type SaveStatus = "idle" | "saving";
type SyncConflictState = {
  impactedDates: string[];
  impactedLogMealsCount: number;
  impactedPlanMealsCount: number;
  saveData: SlotSaveData[];
};

type PendingDateRangeChange = {
  nextRange: DateRangeValue;
  nextPlan: PlanInputType;
  lostMealsCount: number;
  relocatedCount: number;
};

export function PlanEditor({
  planId,
  initialPlan,
  recipes,
  ingredientOptions,
  familyMembers = [],
  sharedDateRange,
  hideInlineControls = false,
  hidePageHeader = false,
  disableDeleteDialog = false,
  onSaveStatusChange,
}: PlanEditorProps) {
  const AUTOSAVE_DELAY_MS = 1000;
  const [plan, setPlan] = useState<PlanInputType>(initialPlan);
  const allSlotsRef = useRef<PlanInputType>(initialPlan);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const editVersionRef = useRef(0);
  const router = useRouter();
  // Router identity from `useRouter()` can change every render in tests; keep push stable for topbar effect deps.
  const routerRef = useRef(router);
  routerRef.current = router;
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting">("idle");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [syncConflict, setSyncConflict] = useState<SyncConflictState | null>(null);
  const [pendingDateRangeChange, setPendingDateRangeChange] =
    useState<PendingDateRangeChange | null>(null);
  const blockedAutosaveVersionRef = useRef<number | null>(null);
  const { setState: setPlanTopbarState, resetState: resetPlanTopbarState } =
    usePlanTopbarState();

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

  const initialDateRange = (() => {
    // Derive picker bounds from the currently persisted plan slots.
    const keys = initialPlan.map((s) => s.date.toISOString().slice(0, 10));
    if (keys.length === 0) return getDefaultDateRange();
    const start = keys.reduce((min, k) => (k < min ? k : min), keys[0]!);
    const end = keys.reduce((max, k) => (k > max ? k : max), keys[0]!);
    return { start, end } satisfies DateRangeValue;
  })();

  const [dateRange, setDateRange] = useState<DateRangeValue>(
    sharedDateRange ?? initialDateRange,
  );

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    if (saveStatus === "saving") return;

    const saveEditVersion = editVersionRef.current;
    setSaveStatus("saving");

    const saveData: SlotSaveData[] = plan.map((s) => ({
      date: new Date(s.date),
      mealType: s.mealType,
      recipeId: s.recipe?.id ?? null,
      customMeal: s.customMeal,
      alternativeRecipeIds: s.alternatives.map((a) => a.id),
      cookingFamilyMemberIds:
        s.cookingFamilyMemberIds && s.cookingFamilyMemberIds.length > 0
          ? s.cookingFamilyMemberIds
          : familyMembers.map((member) => member.id),
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
  }, [familyMembers, isDirty, plan, planId, saveStatus]);

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

      const rescueResult = rebasePlanWithMealRescue({
        slots: allSlotsRef.current,
        oldStartDateKey: dateRange.start,
        newStartDateKey: next.start,
        newEndDateKey: next.end,
      });

      const movedMealsToast = formatMovedMealsToast(rescueResult.movedMeals.length);
      if (movedMealsToast) {
        toast.info(movedMealsToast);
      }

      if (rescueResult.unallocatableMeals.length > 0) {
        setPendingDateRangeChange({
          nextRange: next,
          nextPlan: rescueResult.plan,
          lostMealsCount: rescueResult.unallocatableMeals.length,
          relocatedCount: rescueResult.relocatedCount,
        });
        return;
      }

      setDateRange(next);
      setPlan(rescueResult.plan);
      allSlotsRef.current = rescueResult.plan;

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

  const handleSetMeal = useCallback((slotKey: string, payload: PlanSlotMealPayload) => {
    const applyPayload = (slot: SlotInputType): SlotInputType => {
      const key = `${slot.date.toISOString()}-${slot.mealType}`;
      if (key !== slotKey) return slot;

      if (payload.kind === "recipe") {
        return {
          ...slot,
          recipe: payload.recipe,
          customMeal: null,
          alternatives: slot.alternatives.filter(
            (recipe) => recipe.id !== payload.recipe.id,
          ),
        };
      }

      if (payload.kind === "custom") {
        return {
          ...slot,
          recipe: null,
          customMeal: {
            name: payload.name,
            ingredients: payload.ingredients,
          },
          alternatives: [],
        };
      }

      return {
        ...slot,
        recipe: null,
        customMeal: null,
        alternatives: [],
      };
    };

    allSlotsRef.current = allSlotsRef.current.map(applyPayload);
    setPlan((prev) => prev.map(applyPayload));
  }, []);

  const handleRemove = useCallback((slotKey: string) => {
    allSlotsRef.current = allSlotsRef.current.map((slot) => {
      const key = `${slot.date.toISOString()}-${slot.mealType}`;
      if (key !== slotKey) return slot;
      return { ...slot, recipe: null, customMeal: null, alternatives: [] };
    });

    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return { ...slot, recipe: null, customMeal: null, alternatives: [] };
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

  const handleAudienceChange = useCallback((slotKey: string, memberIds: string[]) => {
    const applyAudience = (slot: SlotInputType): SlotInputType => {
      const key = `${slot.date.toISOString()}-${slot.mealType}`;
      if (key !== slotKey) return slot;
      return { ...slot, cookingFamilyMemberIds: memberIds };
    };

    allSlotsRef.current = allSlotsRef.current.map(applyAudience);
    setPlan((prev) => prev.map(applyAudience));
  }, []);

  useEffect(() => {
    if (!sharedDateRange) {
      return;
    }
    if (
      sharedDateRange.start === dateRange.start &&
      sharedDateRange.end === dateRange.end
    ) {
      return;
    }
    // Shared page picker drives planner range from outside this component.
    handleDateRangeChange(sharedDateRange);
  }, [dateRange.end, dateRange.start, handleDateRangeChange, sharedDateRange]);

  const handleGenerateLog = useCallback(async () => {
    const result = await generateLogFromPlan(planId);
    if (result.type === "success") {
      routerRef.current.push(ROUTES.logView(result.logId));
      return;
    }
    if (result.type === "already_exists") {
      toast.info("Log already generated for this plan.");
      return;
    }
    if (result.type === "date_conflict") {
      toast.info(
        `Cannot generate log. These dates already exist in a log: ${formatDateKeysForToast(result.dates).join(", ")}`,
      );
      return;
    }
    toast.error(result.message);
  }, [planId]);

  useEffect(() => {
    onSaveStatusChange?.(saveStatus === "saving");
  }, [onSaveStatusChange, saveStatus]);

  useEffect(() => {
    if (disableDeleteDialog) {
      return;
    }

    // Standalone PlanEditor routes wire generate/delete through topbar state; shell owns actions when embedded.
    setPlanTopbarState({
      isGenerateDisabled:
        isDirty || saveStatus === "saving" || deleteStatus === "deleting",
      isGenerating: false,
      onGenerateLog: handleGenerateLog,
      onDeletePlan: () => setIsDeleteDialogOpen(true),
      isDeleteDisabled: saveStatus === "saving" || deleteStatus === "deleting",
      isDeleting: deleteStatus === "deleting",
    });

    return () => {
      resetPlanTopbarState();
    };
  }, [
    deleteStatus,
    disableDeleteDialog,
    handleGenerateLog,
    isDirty,
    resetPlanTopbarState,
    saveStatus,
    setPlanTopbarState,
  ]);

  return (
    <>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        {disableDeleteDialog ? null : (
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
        )}
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

      <AlertDialog
        open={pendingDateRangeChange != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDateRangeChange(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDateRangeChange
                ? formatRangeChangeDialogTitle(pendingDateRangeChange.lostMealsCount)
                : "Some meals cannot be kept in this range"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDateRangeChange
                ? formatRangeChangeDialogDescription({
                    relocatedCount: pendingDateRangeChange.relocatedCount,
                    unallocatableCount: pendingDateRangeChange.lostMealsCount,
                  })
                : "Some meals cannot be kept in the selected date range."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDateRangeChange) {
                  return;
                }
                setDateRange(pendingDateRangeChange.nextRange);
                setPlan(pendingDateRangeChange.nextPlan);
                allSlotsRef.current = pendingDateRangeChange.nextPlan;
                editVersionRef.current += 1;
                setIsDirty(true);
                if (saveStatus !== "saving") {
                  setSaveStatus("idle");
                }
                setPendingDateRangeChange(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hidePageHeader && hideInlineControls ? null : (
        <div>
          {hidePageHeader ? null : <PageHeader title="Plan details" />}
          {hideInlineControls ? null : (
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
              </div>

              {saveStatus === "saving" ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-label="Saving plan"
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      <PlanView
        plan={plan}
        recipes={recipes}
        ingredientOptions={ingredientOptions}
        onShuffle={markEdited(handleShuffle)}
        onSetMeal={markEdited(handleSetMeal)}
        onRemove={markEdited(handleRemove)}
        onToggleUsed={markEdited(handleToggleUsed)}
        familyMembers={familyMembers}
        onAudienceChange={markEdited(handleAudienceChange)}
      />
    </>
  );
}
