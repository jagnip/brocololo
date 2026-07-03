"use client";

import {
  SegmentedFilterButton,
  SegmentedFilterGroup,
} from "@/components/ui/segmented-filter-button";
import { FormField } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import {
  mergeDailyAudienceByDate,
  type AudienceGroups,
} from "@/lib/planner/audience-mapping";
import type {
  DayAudienceByMealType,
  PlannerCriteriaInputType,
} from "@/lib/validations/planner";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { Control } from "react-hook-form";
import { FamilyMemberMultiSelect } from "./family-member-multi-select";

type AudienceMode = "grouped" | "daily";

type MealAudienceKey =
  | "breakfastFamilyMemberIds"
  | "lunchFamilyMemberIds"
  | "dinnerFamilyMemberIds";

const MEAL_ROWS: { label: string; key: MealAudienceKey }[] = [
  { label: "Breakfast", key: "breakfastFamilyMemberIds" },
  { label: "Lunch", key: "lunchFamilyMemberIds" },
  { label: "Dinner", key: "dinnerFamilyMemberIds" },
];

type AudienceField = {
  id: string;
  date: string | Date;
};

type PlannerAudienceSectionProps = {
  fields: AudienceField[];
  control: Control<PlannerCriteriaInputType>;
  familyMembers: FamilyMemberRow[];
  audienceMode: AudienceMode;
  groupAudience: AudienceGroups;
  hasWeekdays: boolean;
  hasWeekend: boolean;
  onSwitchToGrouped: () => void;
  onSwitchToDaily: () => void;
  onUpdateGroupAudience: (
    group: keyof AudienceGroups,
    key: MealAudienceKey,
    memberIds: string[],
  ) => void;
  getDayLabel: (date: Date) => string;
};

function renderAudienceSelectRow(params: {
  mealLabel: string;
  selectedIds: string[];
  familyMembers: FamilyMemberRow[];
  onChange: (memberIds: string[]) => void;
}) {
  const { mealLabel, selectedIds, familyMembers, onChange } = params;

  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-1.5">
      <Label>{mealLabel}</Label>
      <FamilyMemberMultiSelect
        familyMembers={familyMembers}
        value={selectedIds}
        onChange={onChange}
      />
    </div>
  );
}

export function PlannerAudienceSection({
  fields,
  control,
  familyMembers,
  audienceMode,
  groupAudience,
  hasWeekdays,
  hasWeekend,
  onSwitchToGrouped,
  onSwitchToDaily,
  onUpdateGroupAudience,
  getDayLabel,
}: PlannerAudienceSectionProps) {
  if (fields.length === 0 || familyMembers.length === 0) {
    return null;
  }

  function renderGroupedMatrix(group: keyof AudienceGroups) {
    const audience = groupAudience[group];

    return (
      <div className="flex flex-col gap-2">
        {/* Same matrix header shape as time limits; one People column instead of Hands-on/Total. */}
        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-1.5">
          <div />
          <Label>People</Label>
        </div>
        {MEAL_ROWS.map((row) =>
          renderAudienceSelectRow({
            mealLabel: row.label,
            selectedIds: audience[row.key],
            familyMembers,
            onChange: (memberIds) =>
              onUpdateGroupAudience(group, row.key, memberIds),
          }),
        )}
      </div>
    );
  }

  function renderDailyMatrix(index: number) {
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-1.5">
          <div />
          <Label>People</Label>
        </div>
        {MEAL_ROWS.map((row) => (
          <FormField
            key={row.key}
            control={control}
            name={`dailyAudienceByMeal.${index}.${row.key}`}
            render={({ field }) => {
              const selectedIds = (field.value as string[] | undefined) ?? [];
              return renderAudienceSelectRow({
                mealLabel: row.label,
                selectedIds,
                familyMembers,
                onChange: field.onChange,
              });
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <Label className="mb-3 block">Who eats</Label>
      <SegmentedFilterGroup
        aria-label="Audience grouping mode"
        className="mb-3 gap-1.5"
      >
        <SegmentedFilterButton
          selected={audienceMode === "grouped"}
          role="radio"
          aria-checked={audienceMode === "grouped"}
          onClick={onSwitchToGrouped}
        >
          Weekdays & weekends
        </SegmentedFilterButton>
        <SegmentedFilterButton
          selected={audienceMode === "daily"}
          role="radio"
          aria-checked={audienceMode === "daily"}
          onClick={onSwitchToDaily}
        >
          All days
        </SegmentedFilterButton>
      </SegmentedFilterGroup>
      {audienceMode === "grouped" ? (
        <div className="flex flex-col gap-4">
          {hasWeekdays ? (
            <div className="flex flex-col gap-1">
              <Subheader className="text-sm">Weekdays</Subheader>
              <div>{renderGroupedMatrix("weekday")}</div>
            </div>
          ) : null}
          {hasWeekend ? (
            <div className="flex flex-col gap-1">
              <Subheader className="text-sm">Weekends</Subheader>
              <div>{renderGroupedMatrix("weekend")}</div>
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
              <div>{renderDailyMatrix(index)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function getDailyAudienceForPlanAllDaysToggle(
  daysInRange: Date[],
  dailyDraft: DayAudienceByMealType[] | null,
  groupAudience: AudienceGroups,
): DayAudienceByMealType[] {
  return mergeDailyAudienceByDate(daysInRange, dailyDraft ?? [], groupAudience);
}
