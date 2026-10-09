"use client";

import { LogNutritionSummary } from "./log-nutrition-summary";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { LogDayData } from "@/lib/log/view-model";
import { getLogDayStatistics, getLogPeriodStatistics } from "@/lib/log/statistics";

type LogPlanSummaryProps = {
  days: LogDayData[];
  excludedDayKeys: Set<string>;
  onExcludedDayKeysChange: (keys: Set<string>) => void;
  disabled?: boolean;
};

function formatReportDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatMacro(value: number, unit: string, hasEntries: boolean): string {
  if (!hasEntries) return "--";
  return `${value.toFixed(unit === "kcal" ? 0 : 1)} ${unit}`;
}

export function LogPlanSummary({
  days,
  excludedDayKeys,
  onExcludedDayKeysChange,
  disabled,
}: LogPlanSummaryProps) {
  const selectedDays = days.filter((day) => !excludedDayKeys.has(day.dateKey));
  const summary = getLogPeriodStatistics(selectedDays);
  const dayStatistics = days.map(getLogDayStatistics);
  const hasLoggedDays = summary.loggedDayCount > 0;
  const metrics = [
    {
      label: "Calories",
      value: formatMacro(summary.dailyAverages.calories, "kcal", hasLoggedDays),
    },
    {
      label: "Protein",
      value: formatMacro(summary.dailyAverages.proteins, "g", hasLoggedDays),
    },
    {
      label: "Fat",
      value: formatMacro(summary.dailyAverages.fats, "g", hasLoggedDays),
    },
    {
      label: "Carbs",
      value: formatMacro(summary.dailyAverages.carbs, "g", hasLoggedDays),
    },
  ];

  return (
    <article className="space-y-6" data-log-plan-summary>
      <LogNutritionSummary label="Average daily nutrition" metrics={metrics} />

      <section className="space-y-3" aria-labelledby="daily-breakdown-title">
        <div className="space-y-1">
          <h2 id="daily-breakdown-title" className="type-h2">
            Daily breakdown
          </h2>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-rose-sm">
          <Label className="flex min-h-11 cursor-pointer gap-3 border-b border-border px-4 py-3 text-sm normal-case tracking-normal text-foreground print:hidden">
            <Checkbox
              aria-label="Select all days"
              disabled={disabled || days.length === 0}
              checked={
                selectedDays.length === days.length && days.length > 0
                  ? true
                  : selectedDays.length > 0
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(checked) => {
                const next = new Set(excludedDayKeys);
                for (const day of days) {
                  if (checked === true) next.delete(day.dateKey);
                  else next.add(day.dateKey);
                }
                onExcludedDayKeysChange(next);
              }}
            />
            Select all days
          </Label>
          <div
            className="hidden grid-cols-5 gap-4 border-b border-border bg-muted px-4 py-2 text-xs font-medium text-muted-foreground sm:grid"
            aria-hidden="true"
          >
            <span>Date</span>
            <span className="text-right">Calories</span>
            <span className="text-right">Protein</span>
            <span className="text-right">Fat</span>
            <span className="text-right">Carbs</span>
          </div>
          <ul aria-label="Daily nutrition statistics">
            {dayStatistics.map((day) => (
              <li
                key={day.day.dateKey}
                className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-5 sm:items-center sm:gap-4 sm:py-3 data-[selected=false]:print:hidden"
                data-log-summary-row
                data-selected={!excludedDayKeys.has(day.day.dateKey)}
              >
                <Label className="col-span-2 flex cursor-pointer gap-3 text-sm font-medium normal-case tracking-normal text-foreground sm:col-span-1">
                  <Checkbox
                    className="print:hidden"
                    aria-label={`Include ${formatReportDate(day.day.date)}`}
                    disabled={disabled}
                    checked={!excludedDayKeys.has(day.day.dateKey)}
                    onCheckedChange={(checked) => {
                      const next = new Set(excludedDayKeys);
                      if (checked === true) next.delete(day.day.dateKey);
                      else next.add(day.day.dateKey);
                      onExcludedDayKeysChange(next);
                    }}
                  />
                  {formatReportDate(day.day.date)}
                </Label>
                {day.hasEntries ? (
                  <>
                    <p className="text-sm tabular-nums sm:text-right">
                      <span className="block text-xs text-muted-foreground sm:hidden">Calories</span>
                      {day.calories.toFixed(0)} kcal
                    </p>
                    <p className="text-sm tabular-nums sm:text-right">
                      <span className="block text-xs text-muted-foreground sm:hidden">Protein</span>
                      {day.proteins.toFixed(1)} g
                    </p>
                    <p className="text-sm tabular-nums sm:text-right">
                      <span className="block text-xs text-muted-foreground sm:hidden">Fat</span>
                      {day.fats.toFixed(1)} g
                    </p>
                    <p className="text-sm tabular-nums sm:text-right">
                      <span className="block text-xs text-muted-foreground sm:hidden">Carbs</span>
                      {day.carbs.toFixed(1)} g
                    </p>
                  </>
                ) : (
                  <p className="col-span-2 text-sm text-muted-foreground sm:col-span-4 sm:text-right">
                    No entries
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="hidden space-y-6 print:block"
        aria-labelledby="logged-food-title"
        data-log-food-diary
      >
        <h2 id="logged-food-title" className="type-h1">
          Logged food and ingredients
        </h2>
        {summary.days.filter((day) => day.hasEntries).map(({ day }) => (
          <section key={day.dateKey} className="space-y-4">
            <h3 className="type-h2 border-b border-border pb-2" data-log-food-heading>
              {formatReportDate(day.date)}
            </h3>
            {day.slots.filter((slot) => slot.recipes.length > 0).map((slot) => (
              <section key={slot.mealType} className="space-y-3">
                <h4 className="type-h3" data-log-food-heading>{slot.label}</h4>
                {slot.recipes.map((recipe) => (
                  <div key={recipe.id} className="space-y-2" data-log-food-group>
                    {recipe.entryRecipeId != null ? (
                      <h5 className="text-sm font-semibold" data-log-food-heading>
                        {recipe.title}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {recipe.cardKind === "removed" ? "Original recipe unavailable" : "Recipe ingredients"}
                        </span>
                      </h5>
                    ) : null}
                    {recipe.ingredients && recipe.ingredients.length > 0 ? (
                      <ul
                        className={recipe.entryRecipeId != null ? "ml-4 border-l border-border pl-4" : ""}
                        aria-label={recipe.entryRecipeId != null ? `${recipe.title} ingredients` : `${slot.label} ingredients without a recipe`}
                      >
                        {recipe.ingredients.map((ingredient, index) => (
                          <li
                            key={`${ingredient.ingredientId}-${ingredient.unitId}-${index}`}
                            className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0"
                            data-log-summary-row
                          >
                            <span>{ingredient.ingredientName ?? "Ingredient unavailable"}</span>
                            <span className="shrink-0 tabular-nums">
                              {ingredient.amount == null ? "Amount unavailable" : ingredient.amount}
                              {ingredient.unitName ? ` ${ingredient.unitName}` : " (unit unavailable)"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No ingredient details recorded.</p>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </section>
        ))}
        {!hasLoggedDays ? <p className="text-sm text-muted-foreground">No food entries recorded.</p> : null}
      </section>
    </article>
  );
}
