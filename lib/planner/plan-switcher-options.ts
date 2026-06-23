import { formatDateRangeLabel } from "@/lib/format-date-range-label";

export type PlanSwitcherOption = {
  id: string;
  label: string;
};

/** Map user plans to shared switcher options (meal planner + groceries breadcrumbs). */
export function mapPlansToSwitcherOptions(
  plans: { id: string; startDate: Date; endDate: Date }[],
): PlanSwitcherOption[] {
  return plans.map((plan) => ({
    id: plan.id,
    label: formatDateRangeLabel(
      new Date(plan.startDate),
      new Date(plan.endDate),
    ),
  }));
}
