"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import MultipleSelector from "@/components/ui/multiselect";
import { MESSAGES } from "@/lib/messages";
import { PlanViewSkeleton } from "./plan-view-skeleton";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { TopbarConfigController } from "@/components/topbar-config";
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
      disabled: isGenerating,
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
    // Empty value means "no limit"; positive integers stay as numeric limits.
    const parsed =
      rawValue === "" ? null : Math.max(1, Math.trunc(Number(rawValue) || 1));
    setGroupTimeLimits((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: parsed,
      },
    }));
  }

  function renderGroupedMatrix(group: keyof TimeLimitGroups) {
    const limits = groupTimeLimits[group];
    return (
      <div className="flex flex-col gap-2">
        {/* Shared matrix header: meal rows on left, time dimensions on top. */}
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <div />
          <Label>Hands-on</Label>
          <Label>Total</Label>
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Breakfast</Label>
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.breakfastHandsOnMax ?? ""}
            onChange={(e) => updateGroupLimit(group, "breakfastHandsOnMax", e.target.value)}
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.breakfastTotalMax ?? ""}
            onChange={(e) => updateGroupLimit(group, "breakfastTotalMax", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Lunch</Label>
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.lunchHandsOnMax ?? ""}
            onChange={(e) => updateGroupLimit(group, "lunchHandsOnMax", e.target.value)}
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.lunchTotalMax ?? ""}
            onChange={(e) => updateGroupLimit(group, "lunchTotalMax", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Dinner</Label>
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.dinnerHandsOnMax ?? ""}
            onChange={(e) => updateGroupLimit(group, "dinnerHandsOnMax", e.target.value)}
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.dinnerTotalMax ?? ""}
            onChange={(e) => updateGroupLimit(group, "dinnerTotalMax", e.target.value)}
          />
        </div>
      </div>
    );
  }

  function renderDailyMatrix(index: number) {
    return (
      <div className="flex flex-col gap-2">
        {/* Keep daily mode matrix identical to grouped mode layout. */}
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <div />
          <Label>Hands-on</Label>
          <Label>Total</Label>
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Breakfast</Label>
          <FormField
            control={form.control}
            name={`dailyTimeLimits.${index}.breakfastHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            )}
          />
          <FormField
            control={form.control}
            name={`dailyTimeLimits.${index}.breakfastTotalMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            )}
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Lunch</Label>
          <FormField
            control={form.control}
            name={`dailyTimeLimits.${index}.lunchHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            )}
          />
          <FormField
            control={form.control}
            name={`dailyTimeLimits.${index}.lunchTotalMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            )}
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Dinner</Label>
          <FormField
            control={form.control}
            name={`dailyTimeLimits.${index}.dinnerHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            )}
          />
          <FormField
            control={form.control}
            name={`dailyTimeLimits.${index}.dinnerTotalMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            )}
          />
        </div>
      </div>
    );
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
              {fields.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="default"
                      variant={timeLimitsMode === "grouped" ? "default" : "outline"}
                      onClick={() => {
                        // Return to grouped time limits while preserving any daily edits.
                        setDailyDraft(
                          form.getValues("dailyTimeLimits") as DayTimeLimitsType[],
                        );
                        setTimeLimitsMode("grouped");
                      }}
                    >
                      Weekdays & weekends
                    </Button>
                    <Button
                      type="button"
                      size="default"
                      variant={timeLimitsMode === "daily" ? "default" : "outline"}
                      onClick={() => {
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
                      }}
                    >
                      All days
                    </Button>
                  </div>
                  {timeLimitsMode === "grouped" ? (
                    <div className="flex flex-col gap-4">
                      {hasWeekdays ? (
                        <div className="flex flex-col gap-1">
                          {/* Recipe-like section subtitle, smaller than Subheader. */}
                          <Subheader className="text-sm">Weekdays</Subheader>
                          <div className="rounded-lg border border-border/60 bg-card p-3">
                            {renderGroupedMatrix("weekday")}
                          </div>
                        </div>
                      ) : null}
                      {hasWeekend ? (
                        <div className="flex flex-col gap-1">
                          <Subheader className="text-sm">Weekends</Subheader>
                          <div className="rounded-lg border border-border/60 bg-card p-3">
                            {renderGroupedMatrix("weekend")}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {fields.map((fieldItem, index) => (
                        <div key={fieldItem.id} className="flex flex-col gap-1">
                          <Subheader className="text-sm">
                            {formatDayLabel(new Date(fieldItem.date))}
                          </Subheader>
                          <div className="rounded-lg border border-border/60 bg-card p-3">
                            {renderDailyMatrix(index)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
              )}
              <FormField
                control={form.control}
                name="rollingRecipes"
                render={({ field }) => {
                  const selected = (field.value ?? []) as RollingRecipeType[];
                  return (
                    <FormItem className="mt-4">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel>Rolling recipes</FormLabel>
                        {/* Bulk-adds unused recipes from the previous plan into rolling recipes */}
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          disabled={previousPlanUnusedRecipes.length === 0}
                          onClick={() => {
                            const currentIds = new Set(
                              selected.map((r) => r.recipeId),
                            );
                            const toAdd = previousPlanUnusedRecipes.filter(
                              (r) => !currentIds.has(r.recipeId),
                            );

                            if (toAdd.length === 0) {
                              toast.info("All unused recipes already added.");
                              return;
                            }

                            field.onChange([...selected, ...toAdd]);
                            toast.success(
                              `Added ${toAdd.length} unused recipe${toAdd.length > 1 ? "s" : ""}.`,
                            );
                          }}
                        >
                          Add unused from previous plan
                        </Button>
                      </div>
                      <FormControl>
                        <MultipleSelector
                          value={selected.map((r) => {
                            const recipe = recipes.find(
                              (rec) => rec.id === r.recipeId,
                            );
                            return {
                              value: r.recipeId,
                              label: recipe?.name ?? r.recipeId,
                            };
                          })}
                          onChange={(options) => {
                            const updated = options.map((o) => {
                              const existing = selected.find(
                                (r) => r.recipeId === o.value,
                              );
                              if (existing) return existing;
                              const recipe = recipes.find(
                                (r) => r.id === o.value,
                              );
                              const defaultMeals =
                                recipe && recipe.servings > 2
                                  ? Math.floor(recipe.servings / 2)
                                  : 1;
                              return { recipeId: o.value, meals: defaultMeals };
                            });
                            field.onChange(updated);
                          }}
                          defaultOptions={recipes.map((r) => ({
                            value: r.id,
                            label: r.name,
                          }))}
                          placeholder="Select recipes to include in plan"
                          emptyIndicator={
                            <p className="text-center text-sm text-muted-foreground">
                              No recipes found.
                            </p>
                          }
                        />
                      </FormControl>
                      {selected
                        .filter((r) => {
                          const recipe = recipes.find(
                            (rec) => rec.id === r.recipeId,
                          );
                          return recipe && recipe.servings > 2;
                        })
                        .map((r) => {
                          const recipe = recipes.find(
                            (rec) => rec.id === r.recipeId,
                          )!;
                          const maxMeals = Math.floor(recipe.servings / 2);
                          return (
                            <div
                              key={r.recipeId}
                              className="flex items-center gap-2 mt-2"
                            >
                              <span className="text-sm truncate flex-1">
                                {recipe.name}
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={maxMeals}
                                className="w-20"
                                value={r.meals}
                                onChange={(e) => {
                                  const newMeals = Math.min(
                                    Math.max(Number(e.target.value) || 1, 1),
                                    maxMeals,
                                  );
                                  field.onChange(
                                    selected.map((s) =>
                                      s.recipeId === r.recipeId
                                        ? { ...s, meals: newMeals }
                                        : s,
                                    ),
                                  );
                                }}
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                meals (max {maxMeals})
                              </span>
                            </div>
                          );
                        })}
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="fridgeIngredientIds"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Fridge ingredients</FormLabel>
                    <FormControl>
                      <MultipleSelector
                        value={ingredients
                          .filter((ing) =>
                            (field.value as string[])?.includes(ing.id),
                          )
                          .map((ing) => ({ value: ing.id, label: ing.name }))}
                        onChange={(options) =>
                          field.onChange(options.map((o) => o.value))
                        }
                        defaultOptions={ingredients.map((ing) => ({
                          value: ing.id,
                          label: ing.name,
                        }))}
                        placeholder="Select ingredients in your fridge"
                        emptyIndicator={
                          <p className="text-center text-sm text-muted-foreground">
                            No ingredients found.
                          </p>
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
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
