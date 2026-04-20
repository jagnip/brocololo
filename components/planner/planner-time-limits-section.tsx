"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import type { MealTimeLimits } from "@/lib/constants";
import type { TimeLimitGroups } from "@/lib/planner/time-limit-mapping";
import type {
  DayTimeLimitsType,
  PlannerCriteriaInputType,
} from "@/lib/validations/planner";
import type { Control } from "react-hook-form";

type TimeLimitsMode = "grouped" | "daily";

type TimeLimitsField = {
  id: string;
  date: string | Date;
};

type PlannerTimeLimitsSectionProps = {
  fields: TimeLimitsField[];
  control: Control<PlannerCriteriaInputType>;
  dailyTimeLimits: DayTimeLimitsType[];
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
  onInvalidStateChange?: (hasInvalid: boolean) => void;
};

export function PlannerTimeLimitsSection({
  fields,
  control,
  dailyTimeLimits,
  timeLimitsMode,
  groupTimeLimits,
  hasWeekdays,
  hasWeekend,
  onSwitchToGrouped,
  onSwitchToDaily,
  onUpdateGroupLimit,
  getDayLabel,
  onInvalidStateChange,
}: PlannerTimeLimitsSectionProps) {
  const [blurredKeys, setBlurredKeys] = useState<Record<string, true>>({});

  const markBlurred = (key: string) => {
    setBlurredKeys((prev) => ({ ...prev, [key]: true }));
  };

  const isInvalidTimeValue = (value: number | null) =>
    value !== null && (!Number.isInteger(value) || value < 1);

  const hasInvalid = useMemo(() => {
    const groupedInvalid = () =>
      Object.values(groupTimeLimits).some((group) =>
        Object.values(group).some((value) =>
          isInvalidTimeValue(value as number | null),
        ),
      );
    const dailyInvalid = () =>
      dailyTimeLimits.some((day) =>
        (
          [
            day.breakfastHandsOnMax,
            day.breakfastTotalMax,
            day.lunchHandsOnMax,
            day.lunchTotalMax,
            day.dinnerHandsOnMax,
            day.dinnerTotalMax,
          ] as Array<number | null>
        ).some((value) => isInvalidTimeValue(value)),
      );
    return timeLimitsMode === "grouped" ? groupedInvalid() : dailyInvalid();
  }, [dailyTimeLimits, groupTimeLimits, timeLimitsMode]);

  useEffect(() => {
    onInvalidStateChange?.(hasInvalid);
  }, [hasInvalid, onInvalidStateChange]);

  const inputErrorClass =
    "border-destructive focus-visible:ring-destructive/30 focus-visible:border-destructive";

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
            onBlur={() => markBlurred(`${group}-breakfastHandsOnMax`)}
            className={
              blurredKeys[`${group}-breakfastHandsOnMax`] &&
              isInvalidTimeValue(limits.breakfastHandsOnMax)
                ? inputErrorClass
                : undefined
            }
            onChange={(e) =>
              onUpdateGroupLimit(group, "breakfastHandsOnMax", e.target.value)
            }
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.breakfastTotalMax ?? ""}
            onBlur={() => markBlurred(`${group}-breakfastTotalMax`)}
            className={
              blurredKeys[`${group}-breakfastTotalMax`] &&
              isInvalidTimeValue(limits.breakfastTotalMax)
                ? inputErrorClass
                : undefined
            }
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
            onBlur={() => markBlurred(`${group}-lunchHandsOnMax`)}
            className={
              blurredKeys[`${group}-lunchHandsOnMax`] &&
              isInvalidTimeValue(limits.lunchHandsOnMax)
                ? inputErrorClass
                : undefined
            }
            onChange={(e) =>
              onUpdateGroupLimit(group, "lunchHandsOnMax", e.target.value)
            }
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.lunchTotalMax ?? ""}
            onBlur={() => markBlurred(`${group}-lunchTotalMax`)}
            className={
              blurredKeys[`${group}-lunchTotalMax`] &&
              isInvalidTimeValue(limits.lunchTotalMax)
                ? inputErrorClass
                : undefined
            }
            onChange={(e) =>
              onUpdateGroupLimit(group, "lunchTotalMax", e.target.value)
            }
          />
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5">
          <Label>Dinner</Label>
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.dinnerHandsOnMax ?? ""}
            onBlur={() => markBlurred(`${group}-dinnerHandsOnMax`)}
            className={
              blurredKeys[`${group}-dinnerHandsOnMax`] &&
              isInvalidTimeValue(limits.dinnerHandsOnMax)
                ? inputErrorClass
                : undefined
            }
            onChange={(e) =>
              onUpdateGroupLimit(group, "dinnerHandsOnMax", e.target.value)
            }
          />
          <Input
            type="number"
            min={1}
            placeholder="∞"
            value={limits.dinnerTotalMax ?? ""}
            onBlur={() => markBlurred(`${group}-dinnerTotalMax`)}
            className={
              blurredKeys[`${group}-dinnerTotalMax`] &&
              isInvalidTimeValue(limits.dinnerTotalMax)
                ? inputErrorClass
                : undefined
            }
            onChange={(e) =>
              onUpdateGroupLimit(group, "dinnerTotalMax", e.target.value)
            }
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
                onBlur={() => {
                  field.onBlur();
                  markBlurred(`daily-${index}-breakfastHandsOnMax`);
                }}
                className={
                  blurredKeys[`daily-${index}-breakfastHandsOnMax`] &&
                  isInvalidTimeValue((value as number | null) ?? null)
                    ? inputErrorClass
                    : undefined
                }
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
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
                onBlur={() => {
                  field.onBlur();
                  markBlurred(`daily-${index}-breakfastTotalMax`);
                }}
                className={
                  blurredKeys[`daily-${index}-breakfastTotalMax`] &&
                  isInvalidTimeValue((value as number | null) ?? null)
                    ? inputErrorClass
                    : undefined
                }
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
            control={control}
            name={`dailyTimeLimits.${index}.lunchHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onBlur={() => {
                  field.onBlur();
                  markBlurred(`daily-${index}-lunchHandsOnMax`);
                }}
                className={
                  blurredKeys[`daily-${index}-lunchHandsOnMax`] &&
                  isInvalidTimeValue((value as number | null) ?? null)
                    ? inputErrorClass
                    : undefined
                }
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
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
                onBlur={() => {
                  field.onBlur();
                  markBlurred(`daily-${index}-lunchTotalMax`);
                }}
                className={
                  blurredKeys[`daily-${index}-lunchTotalMax`] &&
                  isInvalidTimeValue((value as number | null) ?? null)
                    ? inputErrorClass
                    : undefined
                }
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
            control={control}
            name={`dailyTimeLimits.${index}.dinnerHandsOnMax`}
            render={({ field: { value, ...field } }) => (
              <Input
                {...field}
                type="number"
                min={1}
                placeholder="∞"
                value={(value as number | null) ?? ""}
                onBlur={() => {
                  field.onBlur();
                  markBlurred(`daily-${index}-dinnerHandsOnMax`);
                }}
                className={
                  blurredKeys[`daily-${index}-dinnerHandsOnMax`] &&
                  isInvalidTimeValue((value as number | null) ?? null)
                    ? inputErrorClass
                    : undefined
                }
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
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
                onBlur={() => {
                  field.onBlur();
                  markBlurred(`daily-${index}-dinnerTotalMax`);
                }}
                className={
                  blurredKeys[`daily-${index}-dinnerTotalMax`] &&
                  isInvalidTimeValue((value as number | null) ?? null)
                    ? inputErrorClass
                    : undefined
                }
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
              {/* No inner frame/padding around breakfast/lunch/dinner rows. */}
              <div>
                {renderGroupedMatrix("weekday")}
              </div>
            </div>
          ) : null}
          {hasWeekend ? (
            <div className="flex flex-col gap-1">
              <Subheader className="text-sm">Weekends</Subheader>
              {/* No inner frame/padding around breakfast/lunch/dinner rows. */}
              <div>
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
              {/* No inner frame/padding around breakfast/lunch/dinner rows. */}
              <div>
                {renderDailyMatrix(index)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
