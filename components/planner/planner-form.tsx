"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import {
  plannerCriteriaSchema,
  type PlannerCriteriaInputType,
} from "@/lib/validations/planner";
import { toast } from "sonner";
import { getDefaultDateRange, WeekPicker, type DateRangeValue } from "./date-range-picker";
import { PlannerPlanColumn } from "./planner-plan-column";
import {
  getPlannerPlanColumnMode,
  planHasAnyMeal,
  shouldShowGeneratedPlan,
} from "./planner-plan-column-state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScrollbarOnScroll } from "@/hooks/use-scrollbar-on-scroll";
import { PlanInputType, PlanSlotMealPayload, SetPlanMealOptions } from "@/types/planner";
import { generatePlan, savePlan } from "@/actions/planner-actions";
import { getPlanSlotKey, placeRecipeOnPlan } from "@/lib/planner/helpers";
import { rearrangePlanSlots } from "@/lib/planner/rearrange-plan-slots";
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
  planHasAnyMeal,
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
  // Suggest meals rail: thin scrollbar only while that pane is scrolling.
  const suggestMealsScrollbar = useScrollbarOnScroll();
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
  // Clear-all confirmation — only opened when the plan has at least one meal.
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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
        // Pass current draft so filled slots stay put and only empties are filled.
        plan,
      );

      if (result.type === "error") {
        // Keep the last successful plan in memory; failure empty state hides it until criteria change.
        setLastGenerationError(result.message);
        toast.error(result.message);
        return;
      }

      // Show warnings for rolling recipes / unfilled slots that couldn't be placed.
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

  /** Shared entry for Fill empty meals (desktop sticky footer + mobile under form). */
  function handleFillEmptyClick() {
    if (isGenerating) return;
    if (hasInvalidTimeLimitInputs || hasInvalidRollingMealsInputs) return;
    // All slots already have meals — toast instead of a no-op server call.
    if (
      plan.length > 0 &&
      plan.every((slot) => slot.recipe != null || slot.customMeal != null)
    ) {
      toast.info(MESSAGES.planner.nothingToFill);
      return;
    }
    void form.handleSubmit(onSubmit)();
  }

  /** Clear meals only — keep dates, audience, time limits, rolling, fridge. */
  function clearPlanMeals() {
    setPlan((prev) =>
      prev.map((slot) => ({
        ...slot,
        recipe: null,
        customMeal: null,
        alternatives: [],
        batchGroupId: null,
      })),
    );
    setLastGenerationError(null);
    toast.success(MESSAGES.planner.cleared);
  }

  function handleClearPlanClick() {
    if (isGenerating) {
      toast.info(MESSAGES.planner.fillInProgress);
      return;
    }
    if (!planHasAnyMeal(plan)) {
      toast.info(MESSAGES.planner.nothingToClear);
      return;
    }
    setClearConfirmOpen(true);
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

  // Slot↔slot DnD on the create-plan preview (same semantics as plan editor).
  const handleRearrangeSlots = useCallback(
    (sourceKey: string, targetKey: string) => {
      setPlan((prev) => {
        if (!prev) return prev;
        return rearrangePlanSlots(prev, sourceKey, targetKey);
      });
    },
    [],
  );

  const handleSetMeal = useCallback(
    (
      slotKey: string,
      payload: PlanSlotMealPayload,
      options?: SetPlanMealOptions,
    ) => {
      const expandMultiMeal = options?.expandMultiMeal !== false;

      setPlan((prev) => {
        if (!prev) return prev;

        if (payload.kind === "recipe") {
          // Apply the new audience first so multi-meal spillover copies the updated eaters.
          const withAudience = payload.cookingFamilyMemberIds
            ? prev.map((slot) =>
                getPlanSlotKey(slot) === slotKey
                  ? {
                      ...slot,
                      cookingFamilyMemberIds: payload.cookingFamilyMemberIds,
                    }
                  : slot,
              )
            : prev;

          if (expandMultiMeal) {
            return placeRecipeOnPlan(withAudience, slotKey, payload.recipe);
          }

          return withAudience.map((slot) => {
            if (getPlanSlotKey(slot) !== slotKey) return slot;
            return {
              ...slot,
              recipe: payload.recipe,
              customMeal: null,
              alternatives: slot.alternatives.filter(
                (recipe) => recipe.id !== payload.recipe.id,
              ),
              // Bulk batch assignment supplies a shared id; everything else clears it.
              batchGroupId: options?.batchGroupId ?? null,
            };
          });
        }

        return prev.map((slot) => {
          if (getPlanSlotKey(slot) !== slotKey) return slot;

          if (payload.kind === "custom") {
            return {
              ...slot,
              recipe: null,
              customMeal: {
                name: payload.name,
                ingredients: payload.ingredients,
              },
              alternatives: [],
              batchGroupId: null,
              ...(payload.cookingFamilyMemberIds
                ? { cookingFamilyMemberIds: payload.cookingFamilyMemberIds }
                : {}),
            };
          }

          return {
            ...slot,
            recipe: null,
            customMeal: null,
            alternatives: [],
            batchGroupId: null,
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
  // Keep a narrowed generated plan reference so callback closures stay non-null-safe.
  const generatedPlan = shouldShowGeneratedPlan(plan, isGenerating)
    ? plan
    : null;
  // Any meal enables Save; empty plan still shows the button and toasts on click.
  const canSavePlan = planHasAnyMeal(plan);
  // Pulse filled cards while filling empties; full skeleton only when plan is empty.
  const pulsePlanWhileFilling = isGenerating && planHasAnyMeal(plan);
  const planColumnMode = getPlannerPlanColumnMode({
    isGenerating,
    plan,
    lastGenerationError,
  });
  const showPlanColumn = planColumnMode !== "idle";
  const fridgeIngredientIds = (form.watch("fridgeIngredientIds") ??
    []) as string[];
  const ingredientOptions = ingredientsToLogIngredientOptions(ingredients);
  const fillEmptyLabel = isGenerating
    ? MESSAGES.planner.generatePending
    : "Suggest meals";
  // Clear + Save share the top bar; Suggest meals lives in the left column.
  const topbarActions = [
    {
      id: "clear-plan",
      label: "Clear plan",
      onClick: handleClearPlanClick,
      variant: "outline" as const,
      size: "default" as const,
      ariaLabel: "Clear all meals from this plan",
    },
    {
      id: "save-plan",
      label: isSaving ? MESSAGES.planner.savePending : "Save plan",
      onClick: () => {
        if (!canSavePlan) {
          toast.info(MESSAGES.planner.nothingToSave);
          return;
        }
        void handleSavePlan(plan);
      },
      // Always clickable for discoverability; toast when there is nothing to save.
      disabled: isSaving,
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

  // After a failed Fill empty, editing criteria brings back the last plan (no empty placeholder).
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

      {/* Confirm before wiping every meal from the draft. */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all meals?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every meal from the plan. Your dates and preferences
              stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-primary-foreground hover:bg-destructive/90"
              onClick={() => {
                clearPlanMeals();
                setClearConfirmOpen(false);
              }}
            >
              Clear
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

      {/* FormProvider wraps both columns so the date field can live with the plan title. */}
      <Form {...form}>
        {/* Desktop: sticky full-height criteria rail; meal plan scrolls with the page. */}
        <div
          className={cn(
            "flex flex-col gap-6 lg:grid lg:items-start lg:gap-x-4 lg:gap-y-6",
            desktopGridColumns,
          )}
        >
          {/* Left: Lists-style card rail — one outer chrome, thin section separators. */}
          <div
            className={cn(
              "flex min-w-0 flex-col",
              // Fill viewport under topbar + gutters (3.5rem + 1rem + 1rem). Plain rem calc —
              // Tailwind breaks on `2*var(...)` in arbitrary values, which left empty space below.
              // overflow-hidden: at lg the narrow rail wraps criteria taller than the viewport;
              // without clipping, that overflow expands document scrollHeight and leaves a
              // huge blank gap under the columns once you scroll (worse on lg than xl).
              // top-4 = page gutter under the topbar (topbar is outside [data-app-scroll]).
              "lg:sticky lg:top-4 lg:h-[calc(100dvh-5.5rem)] lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-hidden",
            )}
          >
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className={cn(
                "flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden",
                // Mobile: keep Lists card chrome when folded (title + caret only).
                // Desktop: chrome when expanded; collapsed = caret-only rail.
                "rounded-xl border border-border bg-card",
                isFormCollapsed &&
                  "lg:rounded-none lg:border-0 lg:bg-transparent lg:items-center lg:justify-start",
              )}
            >
              {/* Column title (type-h2); pairs with “Meal plan for” on the right. */}
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 p-4",
                  // Desktop collapsed: center the caret in the narrow rail.
                  isFormCollapsed && "lg:justify-center lg:p-0",
                )}
              >
                <Subheader
                  className={cn(
                    // Keep the title on mobile when folded; hide it in the desktop caret rail.
                    isFormCollapsed && "lg:hidden",
                  )}
                >
                  Suggest meals
                </Subheader>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFormCollapsed((prev) => !prev)}
                  aria-expanded={!isFormCollapsed}
                  aria-label={
                    isFormCollapsed
                      ? "Expand suggest meals"
                      : "Collapse suggest meals"
                  }
                  className="size-8 shrink-0"
                >
                  {/* Mobile: up/down. Desktop: left/right (same control, same state). */}
                  {isFormCollapsed ? (
                    <>
                      <ChevronDown className="size-4 lg:hidden" aria-hidden />
                      <ChevronRight
                        className="hidden size-4 lg:block"
                        aria-hidden
                      />
                    </>
                  ) : (
                    <>
                      <ChevronUp className="size-4 lg:hidden" aria-hidden />
                      <ChevronLeft
                        className="hidden size-4 lg:block"
                        aria-hidden
                      />
                    </>
                  )}
                </Button>
              </div>

              {/* Body: criteria separated by thin rules (no nested cards). Date lives on the plan column. */}
              <div
                className={cn(
                  "flex min-h-0 min-w-0 flex-1 flex-col",
                  // Folded on any viewport — mobile accordion + desktop caret rail.
                  isFormCollapsed && "hidden",
                )}
              >
                {/* Padding on the inner wrapper so full-width controls span edge-to-edge between gutters. */}
                <div
                  ref={suggestMealsScrollbar.ref}
                  className={cn(
                    "min-h-0 min-w-0 flex-1 overflow-y-auto",
                    suggestMealsScrollbar.className,
                  )}
                  style={suggestMealsScrollbar.style}
                  onScroll={suggestMealsScrollbar.onScroll}
                >
                  {/* Right inset = 1rem − reserved gutter so both sides match when bar is hidden. */}
                  <div className="min-w-0 divide-y divide-border pl-4 pr-[calc(1rem-var(--suggest-scrollbar-reserve,15px))]">
                    {/* Time constraints — no top padding; spacing comes from the Suggest meals header. */}
                    <div className="min-w-0 pb-4">
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
                    </div>

                    {/* Who eats */}
                    <div className="min-w-0 py-4">
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
                    </div>

                    {/* Rolling + fridge — last divide-y section (no trailing rule under fridge). */}
                    <div className="min-w-0 py-4">
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
                              previousPlanUnusedRecipes={
                                previousPlanUnusedRecipes
                              }
                              onInvalidStateChange={
                                setHasInvalidRollingMealsInputs
                              }
                            />
                          );
                        }}
                      />
                    </div>
                  </div>

                  {/* Outside divide-y so it doesn't draw a rule under fridge ingredients on lg. */}
                  <div className="min-w-0 py-4 pl-4 pr-[calc(1rem-var(--suggest-scrollbar-reserve,15px))] lg:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleFillEmptyClick}
                      aria-busy={isGenerating}
                      aria-label="Suggest meals for empty slots"
                    >
                      {fillEmptyLabel}
                    </Button>
                  </div>
                </div>

                {/* Desktop: CTA pinned to bottom of the Lists-style card */}
                <div className="hidden shrink-0 border-t border-border p-4 lg:block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleFillEmptyClick}
                    aria-busy={isGenerating}
                    aria-label="Suggest meals for empty slots"
                  >
                    {fillEmptyLabel}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Right (desktop) / below suggest (mobile): date title + meal grid.
              Height here drives the sticky left rail's containing block — keep this column
              in normal flow (not sticky) so `sticky` on the left can engage. */}
          <div
            className={cn(
              "min-w-0 space-y-6",
              // Desktop always shows the date header; mobile only when the plan column has content.
              showPlanColumn ? "block" : "hidden lg:block",
              pulsePlanWhileFilling && "animate-pulse",
            )}
          >
            {/* Column title + date picker — drives suggest criteria and the meal grid. */}
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Subheader className="shrink-0 whitespace-nowrap">
                Meal plan for
              </Subheader>
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-1 gap-0 sm:max-w-sm">
                    <FormControl>
                      <WeekPicker
                        value={field.value}
                        onChange={field.onChange}
                        occupiedDateKeys={occupiedDateKeys}
                        compact
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              onRearrangeSlots={handleRearrangeSlots}
              familyMembers={familyMembers}
              onAudienceChange={handleAudienceChange}
              dayLabelVariant="subtext"
            />
          </div>
        </div>
      </Form>
    </>
  );
}
