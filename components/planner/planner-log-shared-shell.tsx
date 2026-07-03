"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTopbar } from "@/components/context/topbar-context";
import { type DateRangeValue } from "@/components/planner/date-range-picker";
import { PlanDateRangeDialog } from "@/components/planner/plan-date-range-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { LogMealSelectorOption } from "@/lib/log/meal-selector-options";
import type {
  LogIngredientOption,
  EditableIngredientRow,
} from "@/components/log/log-ingredients-form";
import { useOptimistic, useTransition } from "react";
import { ROUTES } from "@/lib/constants";
import {
  generateGroceryListFromPlan,
  getGroceryGenerationMealOptions,
} from "@/actions/shopping-list-actions";
import { GroceryMealSelectionDialog } from "@/components/planner/grocery-meal-selection-dialog";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import type { GroceryGenerationExclusions } from "@/lib/groceries/generation-options";
import type { GroceryMealOption } from "@/lib/groceries/generation-options";

type PlannerLogTab = "plan" | "log";

type PlannerLogShellProps = {
  planId: string;
  initialTab: PlannerLogTab;
  initialDateRange: DateRangeValue;
  initialPlan: PlanInputType;
  plannerRecipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  plannedMealsBySlotKey: Record<
    string,
    { name: string; ingredients: EditableIngredientRow[] }
  >;
  familyMembers: FamilyMemberRow[];
  familyMemberId: string;
  logData: {
    logId: string;
    days: LogDayData[];
    plannerPool: PlannerPoolCardData[];
    recipeOptions: LogMealSelectorOption[];
    ingredientOptions: LogIngredientOption[];
  } | null;
  /** When true, generating again replaces the persisted list — we confirm first. */
  hasExistingShoppingList: boolean;
};

export function PlannerLogSharedShell({
  planId,
  initialTab,
  initialDateRange,
  initialPlan,
  plannerRecipes,
  ingredientOptions,
  plannedMealsBySlotKey,
  familyMembers,
  familyMemberId,
  logData,
  hasExistingShoppingList,
}: PlannerLogShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);

  const tabFromUrl = searchParams.get("tab");
  const activeTab: PlannerLogTab =
    tabFromUrl === "log" || tabFromUrl === "plan" ? tabFromUrl : initialTab;
  const [isTabPending, startTabTransition] = useTransition();
  const [isGeneratingGroceries, startGroceryTransition] = useTransition();
  const [optimisticTab, setOptimisticTab] =
    useOptimistic<PlannerLogTab>(activeTab);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false);
  const [isOverwriteGroceryDialogOpen, setIsOverwriteGroceryDialogOpen] =
    useState(false);
  const [isMealSelectionOpen, setIsMealSelectionOpen] = useState(false);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [mealOptions, setMealOptions] = useState<GroceryMealOption[]>([]);
  const [pendingExclusions, setPendingExclusions] =
    useState<GroceryGenerationExclusions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [trackToolbarControls, setTrackToolbarControls] =
    useState<ReactNode | null>(null);
  const [isPlanSaving, setIsPlanSaving] = useState(false);
  const [isLogSaving, setIsLogSaving] = useState(false);
  const { isLogFilterPending } = useTopbar();
  const { setState: setPlanTopbarState, resetState: resetPlanTopbarState } =
    usePlanTopbarState();
  const displayedTab = isTabPending ? optimisticTab : activeTab;
  const isTrackTab = displayedTab === "log";
  const showToolbarSpinner =
    isTabPending ||
    isPlanSaving ||
    (isTrackTab && (isLogFilterPending || isLogSaving));

  const setTab = (nextTab: PlannerLogTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    params.set("memberId", familyMemberId);
    const query = params.toString();
    router.push(query ? `/plan/${planId}?${query}` : `/plan/${planId}`);
  };

  const hasLogData = useMemo(() => logData != null, [logData]);

  const openMealSelectionDialog = useCallback(() => {
    setIsMealSelectionOpen(true);
    setIsLoadingMeals(true);
    setMealOptions([]);

    void (async () => {
      const result = await getGroceryGenerationMealOptions(planId);
      setIsLoadingMeals(false);
      if (result.type === "error") {
        toast.error(result.message);
        setIsMealSelectionOpen(false);
        return;
      }
      setMealOptions(result.meals);
    })();
  }, [planId]);

  const runGenerateGroceries = useCallback(
    (exclusions: GroceryGenerationExclusions) => {
      startGroceryTransition(async () => {
        const result = await generateGroceryListFromPlan(planId, exclusions);
        if (result.type === "error") {
          toast.error(result.message);
          return;
        }
        setPendingExclusions(null);
        toast.success("Grocery list generated.");
        router.push(ROUTES.groceriesView(planId));
        router.refresh();
      });
    },
    [planId, router, startGroceryTransition],
  );

  const handleMealSelectionConfirm = (
    exclusions: GroceryGenerationExclusions,
  ) => {
    setIsMealSelectionOpen(false);

    if (hasExistingShoppingList) {
      setPendingExclusions(exclusions);
      setIsOverwriteGroceryDialogOpen(true);
      return;
    }

    runGenerateGroceries(exclusions);
  };

  const actionBusy =
    isDeleting || isGeneratingGroceries || isLoadingMeals;

  useEffect(() => {
    setPlanTopbarState({
      onEditDates: () => setIsDateRangeDialogOpen(true),
      onGenerateGroceryList: openMealSelectionDialog,
      onDeletePlan: () => setIsDeleteDialogOpen(true),
      isEditDatesDisabled: actionBusy,
      isGenerateDisabled: false,
      isGenerating: isGeneratingGroceries,
      isLoadingMeals,
      isDeleteDisabled: actionBusy,
      isDeleting,
    });

    return () => {
      resetPlanTopbarState();
    };
  }, [
    actionBusy,
    isDeleting,
    isGeneratingGroceries,
    isLoadingMeals,
    openMealSelectionDialog,
    resetPlanTopbarState,
    setPlanTopbarState,
  ]);

  useEffect(() => {
    if (!isTrackTab) {
      setTrackToolbarControls(null);
    }
  }, [isTrackTab]);

  return (
    <div className="min-w-0 space-y-4">
      <PlanDateRangeDialog
        open={isDateRangeDialogOpen}
        onOpenChange={setIsDateRangeDialogOpen}
        value={dateRange}
        disabled={actionBusy}
        onSave={setDateRange}
      />

      <GroceryMealSelectionDialog
        open={isMealSelectionOpen}
        meals={mealOptions}
        isLoading={isLoadingMeals}
        isGenerating={isGeneratingGroceries}
        onConfirm={handleMealSelectionConfirm}
        onCancel={() => {
          if (!isGeneratingGroceries) {
            setIsMealSelectionOpen(false);
          }
        }}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
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

      <AlertDialog
        open={isOverwriteGroceryDialogOpen}
        onOpenChange={setIsOverwriteGroceryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing grocery list?</AlertDialogTitle>
            <AlertDialogDescription>
              This plan already has a shopping list. Generating again will
              permanently replace its contents with a new list from your current
              meals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingExclusions(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsOverwriteGroceryDialogOpen(false);
                if (pendingExclusions) {
                  runGenerateGroceries(pendingExclusions);
                }
              }}
            >
              Replace list
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
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
            <TabsList className="h-10 gap-[2px] shadow-xs">
              <TabsTrigger value="plan">Manage</TabsTrigger>
              <TabsTrigger value="log">Track</TabsTrigger>
            </TabsList>
          </Tabs>
          {showToolbarSpinner ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-label={
                isPlanSaving
                  ? "Saving plan"
                  : isLogSaving
                    ? "Saving log"
                    : isTabPending
                      ? "Loading tab"
                      : "Loading log"
              }
            />
          ) : null}
        </div>
        {isTrackTab && trackToolbarControls ? (
          <div className="flex min-w-0 items-center gap-2">
            {trackToolbarControls}
          </div>
        ) : null}
      </div>

      <Tabs value={displayedTab} className="w-full">
        <TabsContent
          value="plan"
          forceMount
          className={displayedTab !== "plan" ? "hidden" : undefined}
        >
          <PlanEditor
            planId={planId}
            initialPlan={initialPlan}
            recipes={plannerRecipes}
            ingredientOptions={ingredientOptions}
            familyMembers={familyMembers}
            sharedDateRange={dateRange}
            hideInlineControls
            hidePageHeader
            disableDeleteDialog
            onSaveStatusChange={setIsPlanSaving}
          />
        </TabsContent>
        <TabsContent value="log">
          {hasLogData && logData ? (
            <LogDayViewController
              days={logData.days}
              familyMembers={familyMembers}
              plannerPool={logData.plannerPool}
              logId={logData.logId}
              familyMemberId={familyMemberId}
              recipeOptions={logData.recipeOptions}
              ingredientOptions={logData.ingredientOptions}
              plannedMealsBySlotKey={plannedMealsBySlotKey}
              dateRange={dateRange}
              allowDayManagement={false}
              hideDayPersonInHeader
              onRegisterToolbarControls={setTrackToolbarControls}
              onSaveStatusChange={setIsLogSaving}
            />
          ) : (
            <section className="rounded-lg border border-border bg-card p-6">
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
