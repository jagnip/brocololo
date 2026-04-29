"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WeekPicker, type DateRangeValue } from "@/components/planner/date-range-picker";
import { cn } from "@/lib/utils";
import { PlanEditor } from "@/components/planner/plan-editor";
import { LogDayViewController } from "@/components/log/log-day-view";
import type { PlanInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import type { LogDayData, PlannerPoolCardData } from "@/lib/log/view-model";
import type { LogIngredientOption, EditableIngredientRow } from "@/components/log/log-ingredients-form";

type PersonType = "PRIMARY" | "SECONDARY";
type PlannerLogTab = "plan" | "log";

type PlannerLogShellProps = {
  planId: string;
  initialTab: PlannerLogTab;
  initialDateRange: DateRangeValue;
  initialPlan: PlanInputType;
  plannerRecipes: RecipeType[];
  person: PersonType;
  logData: {
    logId: string;
    days: LogDayData[];
    plannerPool: PlannerPoolCardData[];
    recipeOptions: Array<{
      id: string;
      name: string;
      initialRows: EditableIngredientRow[];
    }>;
    ingredientOptions: LogIngredientOption[];
  } | null;
};

export function PlannerLogSharedShell({
  planId,
  initialTab,
  initialDateRange,
  initialPlan,
  plannerRecipes,
  person,
  logData,
}: PlannerLogShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Shared range is local UI state so both tabs update instantly without route refresh.
  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);

  const tabFromUrl = searchParams.get("tab");
  const activeTab: PlannerLogTab =
    tabFromUrl === "log" || tabFromUrl === "plan" ? tabFromUrl : initialTab;

  const setTab = (nextTab: PlannerLogTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    params.set("person", person);
    const query = params.toString();
    router.push(query ? `/plan/${planId}?${query}` : `/plan/${planId}`);
  };

  const hasLogData = useMemo(() => logData != null, [logData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        {/* Shared date range applies to both planner and log views. */}
        <div className="w-full max-w-sm">
          <WeekPicker value={dateRange} onChange={setDateRange} compact className="w-full" />
        </div>

        <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-muted p-1">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "plan" ? "secondary" : "ghost"}
            onClick={() => setTab("plan")}
            className={cn("h-8 px-3", activeTab === "plan" && "shadow-xs")}
          >
            Plan
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "log" ? "secondary" : "ghost"}
            onClick={() => setTab("log")}
            className={cn("h-8 px-3", activeTab === "log" && "shadow-xs")}
          >
            Log
          </Button>
        </div>
      </div>

      {activeTab === "plan" ? (
        <PlanEditor
          planId={planId}
          initialPlan={initialPlan}
          recipes={plannerRecipes}
          sharedDateRange={dateRange}
          hideInlineControls
        />
      ) : hasLogData && logData ? (
        <LogDayViewController
          days={logData.days}
          plannerPool={logData.plannerPool}
          logId={logData.logId}
          person={person}
          recipeOptions={logData.recipeOptions}
          ingredientOptions={logData.ingredientOptions}
          dateRange={dateRange}
          allowDayManagement={false}
        />
      ) : (
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-medium">No log yet for this plan</h2>
          <p className="text-sm text-muted-foreground">
            A log will appear automatically for newly created plans.
          </p>
        </section>
      )}
    </div>
  );
}
