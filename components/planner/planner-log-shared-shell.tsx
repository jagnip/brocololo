"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  WeekPicker,
  type DateRangeValue,
} from "@/components/planner/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { PlanEditor } from "@/components/planner/plan-editor";
import { LogDayViewController } from "@/components/log/log-day-view";
import { usePlanTopbarState } from "@/components/planner/plan-topbar-state-context";
import { deletePlanAction } from "@/actions/planner-actions";
import { toast } from "sonner";
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
import type { PlanInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import type { LogDayData, PlannerPoolCardData } from "@/lib/log/view-model";
import type {
  LogIngredientOption,
  EditableIngredientRow,
} from "@/components/log/log-ingredients-form";
import { useEffect, useOptimistic, useTransition } from "react";
import { ROUTES } from "@/lib/constants";

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
  const [optimisticTab, setOptimisticTab] =
    useOptimistic<PlannerLogTab>(activeTab);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setState: setPlanTopbarState, resetState: resetPlanTopbarState } =
    usePlanTopbarState();
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
  const isTrackTab = displayedTab === "log";

  useEffect(() => {
    // Shared shell owns delete action availability for both Manage and Track tabs.
    setPlanTopbarState({
      isGenerateDisabled: true,
      isGenerating: false,
      isDeleteDisabled: isDeleting,
      isDeleting,
      onGenerateLog: undefined,
      onDeletePlan: () => setIsDeleteDialogOpen(true),
    });

    return () => {
      resetPlanTopbarState();
    };
  }, [isDeleting, resetPlanTopbarState, setPlanTopbarState]);

  return (
    <div className="space-y-4">
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isTrackTab
                ? "Delete meal plan and tracking log?"
                : "Delete this meal plan permanently?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isTrackTab
                ? "This will permanently delete both the plan and its tracking log."
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDeleting(true);
                void (async () => {
                  try {
                    const result = await deletePlanAction(planId);
                    if (result.type === "error") {
                      toast.error(result.message);
                      return;
                    }
                    router.push(ROUTES.planCurrent);
                    router.refresh();
                  } finally {
                    setIsDeleting(false);
                    setIsDeleteDialogOpen(false);
                  }
                })();
              }}
            >
              Delete plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            {/* Shared top-level title for both tabs. */}
            {/* <PageHeader title="Plan & log" className="shrink-0" /> */}
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
                <TabsTrigger value="plan">Manage</TabsTrigger>
                <TabsTrigger value="log">Track</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {/* Shared date range applies to both planner and log views. */}
          <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[20rem] sm:max-w-md lg:min-w-[24rem] lg:max-w-lg">
            <Label className="shrink-0 text-xs text-muted-foreground">Plan for</Label>
            <WeekPicker
              value={dateRange}
              onChange={setDateRange}
              compact
              className="w-full"
            />
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
            disableDeleteDialog
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
