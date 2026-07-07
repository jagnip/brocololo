"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  plannerCriteriaSchema,
  type PlannerCriteriaInputType,
} from "@/lib/validations/planner";
import { toast } from "sonner";
import { getDefaultDateRange, WeekPicker, type DateRangeValue } from "./date-range-picker";
import { PlannerPlanColumn } from "./planner-plan-column";
import {
  getPlannerPlanColumnMode,
  shouldShowGeneratedPlan,
} from "./planner-plan-column-state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlanInputType, PlanSlotMealPayload } from "@/types/planner";
import { generatePlan, savePlan } from "@/actions/planner-actions";
import type {
  DayAudienceByMealType,
  DayTimeLimitsType,
  RollingRecipeType,
} from "@/lib/validations/planner";
import { getDaysInRange, formatDayLabel } from "@/lib/planner/helpers";
import {
  ROUTES,
  type MealTimeLimits,
  WEEKDAY_TIME_LIMIT_DEFAULTS,
  WEEKEND_TIME_LIMIT_DEFAULTS,
} from "@/lib/constants";
import { IngredientType } from "@/types/ingredient";
import { RecipeType } from "@/types/recipe";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { TopbarConfigController } from "@/components/topbar-config";
import { PlannerTimeLimitsSection } from "./planner-time-limits-section";
import {
  getDailyAudienceForPlanAllDaysToggle,
  PlannerAudienceSection,
} from "./planner-audience-section";
import { PlannerRollingRecipesSection } from "./planner-rolling-recipes-section";
import {
  createDefaultAudienceGroups,
  mapGroupAudienceToDaily,
  mergeDailyAudienceByDate,
  type AudienceGroups,
} from "@/lib/planner/audience-mapping";
import {
  getRangeGroupAvailability,
  mapGroupLimitsToDailyLimits,
  mergeDailyLimitsByDate,
  type TimeLimitGroups,
} from "@/lib/planner/time-limit-mapping";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { ingredientsToLogIngredientOptions } from "@/lib/ingredients/to-log-ingredient-options";
import { createEmptyPlanSlotsForDateRange } from "@/lib/planner/plan-date-rebase";
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

type PlannerFormProps = {
  ingredients: IngredientType[];
  recipes: RecipeType[];
  previousPlanUnusedRecipes: RollingRecipeType[];
  occupiedDateKeys: string[];
  familyMembers: FamilyMemberRow[];
};

type TimeLimitsMode = "grouped" | "daily";
type AudienceMode = "grouped" | "daily";

export {
  getPlannerPlanColumnMode,
  shouldShowGeneratedPlan,
} from "./planner-plan-column-state";

export function getDailyLimitsForPlanAllDaysToggle(
  daysInRange: Date[],
  dailyDraft: DayTimeLimitsType[] | null,
  groupTimeLimits: TimeLimitGroups,
): DayTimeLimitsType[] {
  // Reuse existing daily edits when available; fill missing days from grouped values.
  return mergeDailyLimitsByDate(daysInRange, dailyDraft ?? [], groupTimeLimits);
}

export function PlannerForm({
  ingredients,
  recipes,
  previousPlanUnusedRecipes,
  occupiedDateKeys,
  familyMembers,
}: PlannerFormProps) {
  const defaultFamilyMemberIds = familyMembers.map((member) => member.id);
  const initialPlannerState = useMemo(() => {
    const dateRange = getDefaultDateRange(occupiedDateKeys);
    return {
      dateRange,
      plan: createEmptyPlanSlotsForDateRange(dateRange.start, dateRange.end),
    };
  }, [occupiedDateKeys]);
  const [plan, setPlan] = useState<PlanInputType>(initialPlannerState.plan);
  const [lastGenerationError, setLastGenerationError] = useState<string | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInvalidTimeLimitInputs, setHasInvalidTimeLimitInputs] =
    useState(false);
  const [hasInvalidRollingMealsInputs, setHasInvalidRollingMealsInputs] =
    useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  // Desktop split: form(2) + plan(4), with collapsible left rail.
  const desktopGridColumns = isFormCollapsed
    ? "lg:grid-cols-[2rem_minmax(0,1fr)]"
    : "lg:grid-cols-[minmax(306px,1fr)_minmax(0,2fr)]";
  // Default mode is grouped editing; users can expand to per-day limits.
  const [timeLimitsMode, setTimeLimitsMode] =
    useState<TimeLimitsMode>("grouped");
  // Preserve all user edits made in per-day mode across mode toggles.
  const [dailyDraft, setDailyDraft] = useState<DayTimeLimitsType[] | null>(
    null,
  );
  const [groupTimeLimits, setGroupTimeLimits] = useState<TimeLimitGroups>({
    weekday: { ...WEEKDAY_TIME_LIMIT_DEFAULTS },
    weekend: { ...WEEKEND_TIME_LIMIT_DEFAULTS },
  });
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("grouped");
  const [audienceDraft, setAudienceDraft] = useState<DayAudienceByMealType[] | null>(
    null,
  );
  const [groupAudience, setGroupAudience] = useState<AudienceGroups>(() =>
    createDefaultAudienceGroups(defaultFamilyMemberIds),
  );
  const previousDateRangeRef = useRef<DateRangeValue>(initialPlannerState.dateRange);
  const [pendingRangeRebuild, setPendingRangeRebuild] = useState<{
    previousRange: DateRangeValue;
    nextRange: DateRangeValue;
    nextPlan: PlanInputType;
    lostMealsCount: number;
    relocatedCount: number;
  } | null>(null);

  const form = useForm<PlannerCriteriaInputType>({
    resolver: zodResolver(plannerCriteriaSchema),
    defaultValues: {
      // Prefill to next week (inclusive) or first free 7-day window.
      dateRange: initialPlannerState.dateRange,
      dailyAudienceByMeal: [],
      dailyTimeLimits: [],
      fridgeIngredientIds: [],
      rollingRecipes: [],
    },
  });

  async function onSubmit(values: PlannerCriteriaInputType) {
    // Block generation while numeric fields are invalid (red state in sections).
    if (hasInvalidTimeLimitInputs || hasInvalidRollingMealsInputs) {
      return;
    }
    // Only Find meals should swap the plan column to loading / empty states.
    setIsGenerating(true);
    setLastGenerationError(null);
    try {
      const result = await generatePlan(
        new Date(values.dateRange.start),
        new Date(values.dateRange.end),
        values.dailyAudienceByMeal as DayAudienceByMealType[],
        values.dailyTimeLimits as DayTimeLimitsType[],
        values.fridgeIngredientIds ?? [],
        // Coerced numeric fields are validated by Zod; cast input shape for server action typing.
        (values.rollingRecipes ?? []) as RollingRecipeType[],
      );

      if (result.type === "error") {
        // Keep the last successful plan in memory; failure empty state hides it until criteria change.
        setLastGenerationError(result.message);
        toast.error(result.message);
        return;
      }

      // Show warnings for rolling recipes that couldn't be placed
      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => toast.warning(w));
      }

      setPlan(result.plan);
      setLastGenerationError(null);
      toast.success(MESSAGES.planner.generated);
    } finally {
      setIsGenerating(false);
    }
  }

  // Shuffle: rotate recipe and alternatives for a given slot
  const handleShuffle = useCallback((slotKey: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey || !slot.recipe || slot.alternatives.length === 0)
          return slot;

        // Rotate: current recipe goes to end of alternatives, first alternative becomes recipe
        const [nextRecipe, ...restAlternatives] = slot.alternatives;
        return {
          ...slot,
          recipe: nextRecipe,
          alternatives: [...restAlternatives, slot.recipe],
        };
      });
    });
  }, []);

  const handleRemove = useCallback((slotKey: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return { ...slot, recipe: null, customMeal: null, alternatives: [] };
      });
    });
  }, []);

  const handleSetMeal = useCallback(
    (slotKey: string, payload: PlanSlotMealPayload) => {
      setPlan((prev) => {
        if (!prev) return prev;
        return prev.map((slot) => {
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
        });
      });
    },
    [],
  );

  const handleAudienceChange = useCallback((slotKey: string, memberIds: string[]) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return { ...slot, cookingFamilyMemberIds: memberIds };
      });
    });
  }, []);

  async function handleSavePlan(plan: PlanInputType) {
    setIsSaving(true);
    try {
      const result = await savePlan(plan);
      if (result.type === "date_conflict") {
        // Hard-block collisions so one plan/log owner exists per date globally.
        toast.error(
          `Cannot save plan. Date conflict: ${result.dates.join(", ")}`,
        );
        return;
      }
      if (result.type === "error") {
        toast.error(result.message);
        return;
      }
      toast.success(MESSAGES.planner.saved);
    } finally {
      setIsSaving(false);
    }
  }

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "dailyTimeLimits",
  });
  const {
    fields: audienceFields,
    replace: replaceAudience,
  } = useFieldArray({
    control: form.control,
    name: "dailyAudienceByMeal",
  });
  const watchedDailyTimeLimits =
    (form.watch("dailyTimeLimits") as DayTimeLimitsType[] | undefined) ?? [];
  const watchedDailyAudience =
    (form.watch("dailyAudienceByMeal") as DayAudienceByMealType[] | undefined) ??
    [];

  const dateRange = form.watch("dateRange");
  const defaultAudienceMemberCount = defaultFamilyMemberIds.length;
  // Keep a narrowed generated plan reference so callback closures stay non-null-safe.
  const generatedPlan = shouldShowGeneratedPlan(plan, isGenerating)
    ? plan
    : null;
  const planColumnMode = getPlannerPlanColumnMode({
    isGenerating,
    plan,
    lastGenerationError,
  });
  const showPlanColumn = planColumnMode !== "idle";
  const fridgeIngredientIds = (form.watch("fridgeIngredientIds") ??
    []) as string[];
  const ingredientOptions = ingredientsToLogIngredientOptions(ingredients);
  // Save stays in the global top bar; Find meals lives under the planner column on this page.
  const topbarActions = [
    {
      id: "cancel-plan-create",
      label: "Cancel",
      href: ROUTES.planCurrent,
      variant: "outline" as const,
      size: "default" as const,
      ariaLabel: "Cancel and go back to meal plan",
    },
    {
      id: "save-plan",
      label: isSaving ? MESSAGES.planner.savePending : "Save plan",
      onClick: () => {
        if (!generatedPlan) return;
        void handleSavePlan(generatedPlan);
      },
      // Keep action visible for discoverability; enable only when plan exists.
      disabled: !generatedPlan || isSaving,
      ariaBusy: isSaving,
      variant: "default" as const,
      size: "default" as const,
    },
  ];

  const generationErrorClearSkipRef = useRef(true);
  const audienceCriteriaKey = JSON.stringify({
    mode: audienceMode,
    group: groupAudience,
    daily: watchedDailyAudience,
  });
  const timeLimitsCriteriaKey = JSON.stringify({
    mode: timeLimitsMode,
    group: groupTimeLimits,
    daily: watchedDailyTimeLimits,
  });
  const dateRangeCriteriaKey = `${dateRange?.start ?? ""}|${dateRange?.end ?? ""}`;

  const applyRebuiltPlan = useCallback((nextPlan: PlanInputType) => {
    setPlan(nextPlan);
  }, []);

  // After a failed Find meals, editing criteria brings back the last plan (no empty placeholder).
  useEffect(() => {
    if (generationErrorClearSkipRef.current) {
      generationErrorClearSkipRef.current = false;
      return;
    }
    setLastGenerationError(null);
  }, [audienceCriteriaKey, dateRangeCriteriaKey, timeLimitsCriteriaKey]);

  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) {
      return;
    }
    const previousRange = previousDateRangeRef.current;
    const nextRange = { start: dateRange.start, end: dateRange.end };
    if (
      pendingRangeRebuild &&
      pendingRangeRebuild.nextRange.start === nextRange.start &&
      pendingRangeRebuild.nextRange.end === nextRange.end
    ) {
      return;
    }
    if (!previousRange) {
      previousDateRangeRef.current = nextRange;
      return;
    }
    if (!plan) {
      applyRebuiltPlan(
        createEmptyPlanSlotsForDateRange(nextRange.start, nextRange.end),
      );
      previousDateRangeRef.current = nextRange;
      return;
    }
    if (
      previousRange.start === nextRange.start &&
      previousRange.end === nextRange.end
    ) {
      return;
    }

    const rescueResult = rebasePlanWithMealRescue({
      slots: plan,
      oldStartDateKey: previousRange.start,
      newStartDateKey: nextRange.start,
      newEndDateKey: nextRange.end,
    });

    const movedMealsToast = formatMovedMealsToast(rescueResult.movedMeals.length);
    if (movedMealsToast) {
      toast.info(movedMealsToast);
    }

    if (rescueResult.unallocatableMeals.length > 0) {
      setPendingRangeRebuild({
        previousRange,
        nextRange,
        nextPlan: rescueResult.plan,
        lostMealsCount: rescueResult.unallocatableMeals.length,
        relocatedCount: rescueResult.relocatedCount,
      });
      return;
    }

    applyRebuiltPlan(rescueResult.plan);
    previousDateRangeRef.current = nextRange;
  }, [
    applyRebuiltPlan,
    dateRange?.end,
    dateRange?.start,
    pendingRangeRebuild,
    plan,
  ]);

  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) return;
    const days = getDaysInRange(
      new Date(dateRange.start),
      new Date(dateRange.end),
    );
    const previousDaily = form.getValues(
      "dailyTimeLimits",
    ) as DayTimeLimitsType[];

    // Keep form payload always as per-day limits, regardless of visible mode.
    if (timeLimitsMode === "grouped") {
      replace(mapGroupLimitsToDailyLimits(days, groupTimeLimits));
      return;
    }

    const mergedDaily = mergeDailyLimitsByDate(
      days,
      previousDaily,
      groupTimeLimits,
    );
    replace(mergedDaily);
    // Keep draft aligned with current range while user is in daily mode.
    setDailyDraft(mergedDaily);
  }, [
    dateRange?.start,
    dateRange?.end,
    groupTimeLimits,
    timeLimitsMode,
    form,
    replace,
  ]);

  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) return;
    const days = getDaysInRange(
      new Date(dateRange.start),
      new Date(dateRange.end),
    );
    const previousDaily = form.getValues(
      "dailyAudienceByMeal",
    ) as DayAudienceByMealType[];

    if (audienceMode === "grouped") {
      replaceAudience(mapGroupAudienceToDaily(days, groupAudience));
      return;
    }

    const mergedDaily = mergeDailyAudienceByDate(
      days,
      previousDaily,
      groupAudience,
    );
    replaceAudience(mergedDaily);
    setAudienceDraft(mergedDaily);
  }, [
    dateRange?.start,
    dateRange?.end,
    groupAudience,
    audienceMode,
    form,
    replaceAudience,
  ]);

  const daysInRange =
    dateRange?.start && dateRange?.end
      ? getDaysInRange(new Date(dateRange.start), new Date(dateRange.end))
      : [];
  const { hasWeekdays, hasWeekend } = getRangeGroupAvailability(daysInRange);

  function updateGroupLimit(
    group: keyof TimeLimitGroups,
    key: keyof MealTimeLimits,
    rawValue: string,
  ): void {
    // Keep raw numeric intent (including 0) so UI can show invalid states instead of coercing.
    const parsed = rawValue === "" ? null : Number(rawValue);
    setGroupTimeLimits((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: parsed,
      },
    }));
  }

  function handleSwitchToGroupedTimeLimits() {
    // Return to grouped time limits while preserving any daily edits.
    setDailyDraft(form.getValues("dailyTimeLimits") as DayTimeLimitsType[]);
    setTimeLimitsMode("grouped");
  }

  function handleSwitchToDailyTimeLimits() {
    // First entry into daily mode starts from grouped limits;
    // later entries restore the previously edited daily draft.
    const dailyLimits = getDailyLimitsForPlanAllDaysToggle(
      daysInRange,
      dailyDraft,
      groupTimeLimits,
    );
    setDailyDraft(dailyLimits);
    replace(dailyLimits);
    setTimeLimitsMode("daily");
  }

  function updateGroupAudience(
    group: keyof AudienceGroups,
    key:
      | "breakfastFamilyMemberIds"
      | "lunchFamilyMemberIds"
      | "dinnerFamilyMemberIds",
    memberIds: string[],
  ) {
    if (memberIds.length === 0) {
      return;
    }
    setGroupAudience((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: memberIds,
      },
    }));
  }

  function handleSwitchToGroupedAudience() {
    setAudienceDraft(form.getValues("dailyAudienceByMeal") as DayAudienceByMealType[]);
    setAudienceMode("grouped");
  }

  function handleSwitchToDailyAudience() {
    const dailyAudience = getDailyAudienceForPlanAllDaysToggle(
      daysInRange,
      audienceDraft,
      groupAudience,
    );
    setAudienceDraft(dailyAudience);
    replaceAudience(dailyAudience);
    setAudienceMode("daily");
  }

  return (
    <>
      <AlertDialog
        open={pendingRangeRebuild != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRangeRebuild(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRangeRebuild
                ? formatRangeChangeDialogTitle(pendingRangeRebuild.lostMealsCount)
                : "Some meals cannot be kept in this range"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRangeRebuild
                ? formatRangeChangeDialogDescription({
                    relocatedCount: pendingRangeRebuild.relocatedCount,
                    unallocatableCount: pendingRangeRebuild.lostMealsCount,
                  })
                : "Some meals cannot be kept in the selected date range."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (!pendingRangeRebuild) return;
                previousDateRangeRef.current = pendingRangeRebuild.previousRange;
                form.setValue("dateRange", pendingRangeRebuild.previousRange);
                setPendingRangeRebuild(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingRangeRebuild) return;
                previousDateRangeRef.current = pendingRangeRebuild.nextRange;
                applyRebuiltPlan(pendingRangeRebuild.nextPlan);
                setPendingRangeRebuild(null);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TopbarConfigController
        config={{
          breadcrumbs: [
            { label: "Meal plan", href: ROUTES.planCurrent },
            { label: "Create plan" },
          ],
          actions: topbarActions,
        }}
      />
      {/* Desktop layout follows a 2/4 split: form | plan. */}
      <div
        className={`flex flex-col gap-6 lg:grid ${desktopGridColumns} lg:items-start lg:gap-x-4 lg:gap-y-6`}
      >
        {/* Form + Find meals: one sticky column so scroll does not leave the button under the form. */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-20">
          <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex w-full flex-col"
              >
              {/* Date + collapse: one row on lg; horizontal gap matches planner-time-limits rows (gap-1.5). */}
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="gap-0">
                    <div
                      className={cn(
                        "mb-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-1.5",
                        isFormCollapsed && "lg:justify-end",
                      )}
                    >
                      <div
                        className={cn(
                          "min-w-0 w-full flex-1",
                          // Desktop-only collapse: keep the week picker on small screens.
                          isFormCollapsed && "lg:hidden",
                        )}
                      >
                        <FormControl>
                          <WeekPicker
                            value={field.value}
                            onChange={field.onChange}
                            occupiedDateKeys={occupiedDateKeys}
                            compact
                          />
                        </FormControl>
                      </div>
                      <div className="hidden shrink-0 lg:flex lg:items-center">
                        <span className="sr-only">
                          {isFormCollapsed
                            ? "Planner section collapsed"
                            : "Planner criteria"}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsFormCollapsed((prev) => !prev)}
                          aria-expanded={!isFormCollapsed}
                          aria-label={
                            isFormCollapsed
                              ? "Expand planner form"
                              : "Collapse planner form"
                          }
                          className="size-8"
                        >
                          {isFormCollapsed ? (
                            <ChevronRight className="size-4" />
                          ) : (
                            <ChevronLeft className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className={`block ${isFormCollapsed ? "lg:hidden" : ""}`}>
                <PlannerTimeLimitsSection
                  fields={fields}
                  control={form.control}
                  dailyTimeLimits={watchedDailyTimeLimits}
                  timeLimitsMode={timeLimitsMode}
                  groupTimeLimits={groupTimeLimits}
                  hasWeekdays={hasWeekdays}
                  hasWeekend={hasWeekend}
                  onSwitchToGrouped={handleSwitchToGroupedTimeLimits}
                  onSwitchToDaily={handleSwitchToDailyTimeLimits}
                  onUpdateGroupLimit={updateGroupLimit}
                  getDayLabel={formatDayLabel}
                  onInvalidStateChange={setHasInvalidTimeLimitInputs}
                />
                <PlannerAudienceSection
                  fields={audienceFields}
                  control={form.control}
                  familyMembers={familyMembers}
                  audienceMode={audienceMode}
                  groupAudience={groupAudience}
                  hasWeekdays={hasWeekdays}
                  hasWeekend={hasWeekend}
                  onSwitchToGrouped={handleSwitchToGroupedAudience}
                  onSwitchToDaily={handleSwitchToDailyAudience}
                  onUpdateGroupAudience={updateGroupAudience}
                  getDayLabel={formatDayLabel}
                />
                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                  <FormField
                    control={form.control}
                    name="rollingRecipes"
                    render={({ field }) => {
                      const selected = (field.value ??
                        []) as RollingRecipeType[];
                      return (
                        <PlannerRollingRecipesSection
                          control={form.control}
                          selected={selected}
                          onChange={field.onChange}
                          ingredients={ingredients}
                          recipes={recipes}
                          audienceMemberCount={defaultAudienceMemberCount}
                          previousPlanUnusedRecipes={previousPlanUnusedRecipes}
                          onInvalidStateChange={setHasInvalidRollingMealsInputs}
                        />
                      );
                    }}
                  />
                </div>
              </div>
            </form>
          </Form>
          <Button
            type="button"
            variant="outline"
            size="default"
            className={cn(
              "w-full shrink-0 sm:w-fit",
              // Desktop collapse hides criteria; keep Find meals in sync with that rail.
              isFormCollapsed && "lg:hidden",
            )}
            disabled={
              isGenerating ||
              hasInvalidTimeLimitInputs ||
              hasInvalidRollingMealsInputs
            }
            aria-busy={isGenerating}
            onClick={() => {
              void form.handleSubmit(onSubmit)();
            }}
          >
            {isGenerating ? MESSAGES.planner.generatePending : "Find meals"}
          </Button>
        </div>

        <div className="hidden lg:block">
          <PlannerPlanColumn
            mode={planColumnMode}
            plan={generatedPlan}
            lastGenerationError={lastGenerationError}
            fridgeIngredientIds={fridgeIngredientIds}
            recipes={recipes}
            ingredientOptions={ingredientOptions}
            onShuffle={handleShuffle}
            onSetMeal={handleSetMeal}
            onRemove={handleRemove}
            familyMembers={familyMembers}
            onAudienceChange={handleAudienceChange}
          />
        </div>
        {showPlanColumn ? (
          <div className="lg:hidden">
            <PlannerPlanColumn
              mode={planColumnMode}
              plan={generatedPlan}
              lastGenerationError={lastGenerationError}
              fridgeIngredientIds={fridgeIngredientIds}
              recipes={recipes}
              ingredientOptions={ingredientOptions}
              onShuffle={handleShuffle}
              onSetMeal={handleSetMeal}
              onRemove={handleRemove}
              familyMembers={familyMembers}
              onAudienceChange={handleAudienceChange}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
