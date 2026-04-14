"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import {
  plannerCriteriaSchema,
  type PlannerCriteriaInputType,
} from "@/lib/validations/planner";
import { toast } from "sonner";
import { getDefaultDateRange, WeekPicker } from "./date-range-picker";
import { PlanView } from "./plan-view";
import { useCallback, useEffect, useState } from "react";
import { PlanInputType } from "@/types/planner";
import { generatePlan, savePlan } from "@/actions/planner-actions";
import type { DayTimeLimitsType, RollingRecipeType } from "@/lib/validations/planner";
import { getDaysInRange, formatDayLabel } from "@/lib/planner/helpers";
import {
  type MealTimeLimits,
  WEEKDAY_TIME_LIMIT_DEFAULTS,
  WEEKEND_TIME_LIMIT_DEFAULTS,
} from "@/lib/constants";
import { IngredientType } from "@/types/ingredient";
import { RecipeType } from "@/types/recipe";
import { MESSAGES } from "@/lib/messages";
import { PlanViewSkeleton } from "./plan-view-skeleton";
import { TopbarConfigController } from "@/components/topbar-config";
import { PlannerTimeLimitsSection } from "./planner-time-limits-section";
import { PlannerRollingRecipesSection } from "./planner-rolling-recipes-section";
import {
  getRangeGroupAvailability,
  mapGroupLimitsToDailyLimits,
  mergeDailyLimitsByDate,
  type TimeLimitGroups,
} from "@/lib/planner/time-limit-mapping";

type PlannerFormProps = {
  ingredients: IngredientType[];
  recipes: RecipeType[];
  previousPlanUnusedRecipes: RollingRecipeType[];
};

type TimeLimitsMode = "grouped" | "daily";

export function shouldShowGeneratedPlan(
  plan: PlanInputType | null,
  isGenerating: boolean,
): boolean {
  // Keep result visibility rule explicit for UI and tests.
  return !isGenerating && plan !== null;
}

export function getDailyLimitsForPlanAllDaysToggle(
  daysInRange: Date[],
  dailyDraft: DayTimeLimitsType[] | null,
  groupTimeLimits: TimeLimitGroups,
): DayTimeLimitsType[] {
  // Reuse existing daily edits when available; fill missing days from grouped values.
  return mergeDailyLimitsByDate(daysInRange, dailyDraft ?? [], groupTimeLimits);
}

export function PlannerForm({ ingredients, recipes, previousPlanUnusedRecipes }: PlannerFormProps) {
  const [plan, setPlan] = useState<PlanInputType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInvalidTimeLimitInputs, setHasInvalidTimeLimitInputs] = useState(false);
  const [hasInvalidRollingMealsInputs, setHasInvalidRollingMealsInputs] = useState(false);
  // Default mode is grouped editing; users can expand to per-day limits.
  const [timeLimitsMode, setTimeLimitsMode] = useState<TimeLimitsMode>("grouped");
  // Preserve all user edits made in per-day mode across mode toggles.
  const [dailyDraft, setDailyDraft] = useState<DayTimeLimitsType[] | null>(null);
  const [groupTimeLimits, setGroupTimeLimits] = useState<TimeLimitGroups>({
    weekday: { ...WEEKDAY_TIME_LIMIT_DEFAULTS },
    weekend: { ...WEEKEND_TIME_LIMIT_DEFAULTS },
  });

  const form = useForm<PlannerCriteriaInputType>({
    resolver: zodResolver(plannerCriteriaSchema),
    defaultValues: {
      dateRange: getDefaultDateRange(),
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
    try {
      const result = await generatePlan(
        new Date(values.dateRange.start),
        new Date(values.dateRange.end),
        values.dailyTimeLimits as DayTimeLimitsType[],
        values.fridgeIngredientIds ?? [],
        // Coerced numeric fields are validated by Zod; cast input shape for server action typing.
        (values.rollingRecipes ?? []) as RollingRecipeType[],
      );

      if (result.type === "error") {
        toast.error(result.message);
        return;
      }

      // Show warnings for rolling recipes that couldn't be placed
      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => toast.warning(w));
      }

      setPlan(result.plan);
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
        if (key !== slotKey || !slot.recipe || slot.alternatives.length === 0) return slot;

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
        return { ...slot, recipe: null };
      });
    });
  }, []);

  const handleReplace = useCallback((slotKey: string, newRecipe: RecipeType) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return {
          ...slot,
          recipe: newRecipe,
          alternatives: slot.alternatives.filter((r) => r.id !== newRecipe.id),
        };
      });
    });
  }, []);

  async function handleSavePlan(plan: PlanInputType) {
    setIsSaving(true);
    try {
      const result = await savePlan(plan);
      if (result.type === "date_conflict") {
        // Hard-block collisions so one plan/log owner exists per date globally.
        toast.error(`Cannot save plan. Date conflict: ${result.dates.join(", ")}`);
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
  const watchedDailyTimeLimits =
    (form.watch("dailyTimeLimits") as DayTimeLimitsType[] | undefined) ?? [];

  const dateRange = form.watch("dateRange");
  // Keep a narrowed generated plan reference so callback closures stay non-null-safe.
  const generatedPlan = shouldShowGeneratedPlan(plan, isGenerating) ? plan : null;
  // Keep plan/create actions in the global top bar so controls stay in one place.
  const topbarActions = [
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
      variant: "secondary" as const,
      size: "default" as const,
    },
    {
      id: "find-meals",
      label: isGenerating ? MESSAGES.planner.generatePending : "Find meals",
      onClick: () => {
        void form.handleSubmit(onSubmit)();
      },
      disabled: isGenerating || hasInvalidTimeLimitInputs || hasInvalidRollingMealsInputs,
      ariaBusy: isGenerating,
      variant: "default" as const,
      size: "default" as const,
    },
  ];

  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) return;
    const days = getDaysInRange(
      new Date(dateRange.start),
      new Date(dateRange.end),
    );
    const previousDaily = form.getValues("dailyTimeLimits") as DayTimeLimitsType[];

    // Keep form payload always as per-day limits, regardless of visible mode.
    if (timeLimitsMode === "grouped") {
      replace(mapGroupLimitsToDailyLimits(days, groupTimeLimits));
      return;
    }

    const mergedDaily = mergeDailyLimitsByDate(days, previousDaily, groupTimeLimits);
    replace(mergedDaily);
    // Keep draft aligned with current range while user is in daily mode.
    setDailyDraft(mergedDaily);
  }, [dateRange?.start, dateRange?.end, groupTimeLimits, timeLimitsMode, form, replace]);

  const daysInRange = dateRange?.start && dateRange?.end
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

  return (
    <>
      <TopbarConfigController
        config={{
          actions: topbarActions,
        }}
      />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5 lg:items-start lg:gap-x-4 lg:gap-y-6">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex w-full flex-col"
            >
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <WeekPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <FormField
                  control={form.control}
                  name="rollingRecipes"
                  render={({ field }) => {
                    const selected = (field.value ?? []) as RollingRecipeType[];
                    return (
                      <PlannerRollingRecipesSection
                        control={form.control}
                        selected={selected}
                        onChange={field.onChange}
                        ingredients={ingredients}
                        recipes={recipes}
                        previousPlanUnusedRecipes={previousPlanUnusedRecipes}
                        onInvalidStateChange={setHasInvalidRollingMealsInputs}
                      />
                    );
                  }}
                />
              </div>
            </form>
          </Form>
        </div>

        <div className="hidden lg:block lg:col-span-3">
          {isGenerating ? (
            // While generating a new plan, hide previous results and show loading state.
            <PlanViewSkeleton />
          ) : generatedPlan ? (
            <PlanView
              plan={generatedPlan}
              fridgeIngredientIds={
                (form.watch("fridgeIngredientIds") ?? []) as string[]
              }
              recipes={recipes}
              onShuffle={handleShuffle}
              onReplace={handleReplace}
              onRemove={handleRemove}
            />
          ) : (
            <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-dashed p-0 py-0 shadow-none">
              <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 p-3 text-center">
                {/* Mirror log empty slot styling and wording for the plan empty panel. */}
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                  aria-hidden
                >
                  <Plus className="size-3" />
                </span>
                <p className="text-sm font-medium leading-snug text-foreground">
                  Nothing planned yet
                </p>
                <span className="text-xs text-muted-foreground">
                  Find meals to start
                </span>
              </div>
            </Card>
          )}
        </div>

        {isGenerating || generatedPlan ? (
          <div className="lg:hidden">
            {isGenerating ? (
              <PlanViewSkeleton />
            ) : (
              <PlanView
                plan={generatedPlan!}
                fridgeIngredientIds={
                  (form.watch("fridgeIngredientIds") ?? []) as string[]
                }
                recipes={recipes}
                onShuffle={handleShuffle}
                onReplace={handleReplace}
                onRemove={handleRemove}
              />
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
