"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import type { MealTimeLimits } from "@/lib/constants";
import type { TimeLimitGroups } from "@/lib/planner/time-limit-mapping";
import type { PlannerCriteriaInputType } from "@/lib/validations/planner";
import type { Control } from "react-hook-form";

type TimeLimitsMode = "grouped" | "daily";

type TimeLimitsField = {
  id: string;
  date: string | Date;
};

type PlannerTimeLimitsSectionProps = {
  fields: TimeLimitsField[];
  control: Control<PlannerCriteriaInputType>;
  timeLimitsMode: TimeLimitsMode;
  groupTimeLimits: TimeLimitGroups;
  hasWeekdays: boolean;
  hasWeekend: boolean;
  onSwitchToGrouped: () => void;
  onSwitchToDaily: () => void;
  onUpdateGroupLimit: (
    group: keyof TimeLimitGroups,
    key: keyof MealTimeLimits,
    rawValue: string,
  ) => void;
  getDayLabel: (date: Date) => string;
};

export function PlannerTimeLimitsSection({
  fields,
  control,
  timeLimitsMode,
  groupTimeLimits,
  hasWeekdays,
  hasWeekend,
  onSwitchToGrouped,
  onSwitchToDaily,
  onUpdateGroupLimit,
  getDayLabel,
}: PlannerTimeLimitsSectionProps) {
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
            onChange={(e) =>
              onUpdateGroupLimit(group, "breakfastHandsOnMax", e.target.value)
            }
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.breakfastTotalMax ?? ""}
            onChange={(e) =>
              onUpdateGroupLimit(group, "breakfastTotalMax", e.target.value)
            }
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Lunch</Label>
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.lunchHandsOnMax ?? ""}
            onChange={(e) =>
              onUpdateGroupLimit(group, "lunchHandsOnMax", e.target.value)
            }
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.lunchTotalMax ?? ""}
            onChange={(e) => onUpdateGroupLimit(group, "lunchTotalMax", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Dinner</Label>
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.dinnerHandsOnMax ?? ""}
            onChange={(e) =>
              onUpdateGroupLimit(group, "dinnerHandsOnMax", e.target.value)
            }
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.dinnerTotalMax ?? ""}
            onChange={(e) => onUpdateGroupLimit(group, "dinnerTotalMax", e.target.value)}
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
            control={control}
            name={`dailyTimeLimits.${index}.breakfastHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            )}
          />
          <FormField
            control={control}
            name={`dailyTimeLimits.${index}.breakfastTotalMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            )}
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Lunch</Label>
          <FormField
            control={control}
            name={`dailyTimeLimits.${index}.lunchHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            )}
          />
          <FormField
            control={control}
            name={`dailyTimeLimits.${index}.lunchTotalMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            )}
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Dinner</Label>
          <FormField
            control={control}
            name={`dailyTimeLimits.${index}.dinnerHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            )}
          />
          <FormField
            control={control}
            name={`dailyTimeLimits.${index}.dinnerTotalMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            )}
          />
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Button
          type="button"
          size="default"
          variant={timeLimitsMode === "grouped" ? "default" : "outline"}
          onClick={onSwitchToGrouped}
        >
          Weekdays & weekends
        </Button>
        <Button
          type="button"
          size="default"
          variant={timeLimitsMode === "daily" ? "default" : "outline"}
          onClick={onSwitchToDaily}
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
                {getDayLabel(new Date(fieldItem.date))}
              </Subheader>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                {renderDailyMatrix(index)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
