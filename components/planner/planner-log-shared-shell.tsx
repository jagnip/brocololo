"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WeekPicker, type DateRangeValue } from "@/components/planner/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanEditor } from "@/components/planner/plan-editor";
import { LogDayViewController } from "@/components/log/log-day-view";
import { PageHeader } from "@/components/page-header";
import type { PlanInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import type { LogDayData, PlannerPoolCardData } from "@/lib/log/view-model";
import type { LogIngredientOption, EditableIngredientRow } from "@/components/log/log-ingredients-form";
import { useOptimistic, useTransition } from "react";

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
  const [isTabPending, startTabTransition] = useTransition();
  const [optimisticTab, setOptimisticTab] = useOptimistic<PlannerLogTab>(activeTab);
  // Keep the tab highlight responsive during URL transitions.
  const displayedTab = isTabPending ? optimisticTab : activeTab;

  const setTab = (nextTab: PlannerLogTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    params.set("person", person);
    const query = params.toString();
    router.push(query ? `/plan/${planId}?${query}` : `/plan/${planId}`);
  };

  const hasLogData = useMemo(() => logData != null, [logData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            {/* Shared top-level title for both tabs. */}
            <PageHeader title="Meal program" className="shrink-0" />
            {/* Use shared shadcn tabs primitive for consistent DS behavior. */}
            <Tabs
              value={displayedTab}
              onValueChange={(value) => {
                if (value === "plan" || value === "log") {
                  setOptimisticTab(value);
                  startTabTransition(() => {
                    setTab(value);
                  });
                }
              }}
              className="w-fit shrink-0"
            >
              <TabsList>
                <TabsTrigger value="plan">Plan</TabsTrigger>
                <TabsTrigger value="log">Log</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {/* Shared date range applies to both planner and log views. */}
          <div className="w-full sm:w-auto sm:min-w-[18rem] sm:max-w-sm">
            <WeekPicker value={dateRange} onChange={setDateRange} compact className="w-full" />
          </div>
        </div>
      </div>

      <Tabs value={displayedTab} className="w-full">
        <TabsContent value="plan">
          <PlanEditor
            planId={planId}
            initialPlan={initialPlan}
            recipes={plannerRecipes}
            sharedDateRange={dateRange}
            hideInlineControls
            hidePageHeader
          />
        </TabsContent>
        <TabsContent value="log">
          {hasLogData && logData ? (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
