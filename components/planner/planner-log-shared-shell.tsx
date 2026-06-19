"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  WeekPicker,
  type DateRangeValue,
} from "@/components/planner/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import {
  generateGroceryListFromPlan,
  getGroceryGenerationMealOptions,
} from "@/actions/shopping-list-actions";
import { PlanSelect, type PlanSelectOption } from "@/components/planner/plan-select";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { GroceryMealSelectionDialog } from "@/components/planner/grocery-meal-selection-dialog";
import type { GroceryGenerationExclusions } from "@/lib/groceries/generation-options";
import type { GroceryMealOption } from "@/lib/groceries/generation-options";

type PlannerLogTab = "plan" | "log";

type PlannerLogShellProps = {
  planId: string;
  planOptions: PlanSelectOption[];
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
    recipeOptions: Array<{
      id: string;
      name: string;
      initialRows: EditableIngredientRow[];
    }>;
    ingredientOptions: LogIngredientOption[];
  } | null;
  /** When true, generating again replaces the persisted list — we confirm first. */
  hasExistingShoppingList: boolean;
};

export function PlannerLogSharedShell({
  planId,
  planOptions,
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
  const [isOverwriteGroceryDialogOpen, setIsOverwriteGroceryDialogOpen] =
    useState(false);
  const [isMealSelectionOpen, setIsMealSelectionOpen] = useState(false);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [mealOptions, setMealOptions] = useState<GroceryMealOption[]>([]);
  const [pendingExclusions, setPendingExclusions] =
    useState<GroceryGenerationExclusions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { setState: setPlanTopbarState, resetState: resetPlanTopbarState } =
    usePlanTopbarState();
  const displayedTab = isTabPending ? optimisticTab : activeTab;

  const setTab = (nextTab: PlannerLogTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    params.set("memberId", familyMemberId);
    const query = params.toString();
    router.push(query ? `/plan/${planId}?${query}` : `/plan/${planId}`);
  };

  const hasLogData = useMemo(() => logData != null, [logData]);
  const isTrackTab = displayedTab === "log";

  const runGenerateGroceries = (exclusions: GroceryGenerationExclusions) => {
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
  };

  const openMealSelectionDialog = () => {
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
  };

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

  useEffect(() => {
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
    <div className="min-w-0 space-y-4">
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

      {/* Toolbar: flex-wrap so plan/tabs/date/actions never force horizontal scroll. */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <Label className="shrink-0 text-xs text-muted-foreground">Plan</Label>
            <PlanSelect plans={planOptions} currentPlanId={planId} />
          </div>
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
          <div className="flex min-w-0 flex-1 items-center gap-2 basis-full sm:basis-auto sm:min-w-48 sm:max-w-md lg:max-w-lg">
            <Label className="shrink-0 text-xs text-muted-foreground">
              Date range
            </Label>
            <WeekPicker
              value={dateRange}
              onChange={setDateRange}
              compact
              className="min-w-0 flex-1"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              className="gap-2"
              disabled={isGeneratingGroceries || isDeleting || isLoadingMeals}
              aria-busy={isGeneratingGroceries || isLoadingMeals}
              onClick={openMealSelectionDialog}
            >
              <span className="whitespace-nowrap">
                {isGeneratingGroceries
                  ? "Generating…"
                  : isLoadingMeals
                    ? "Loading…"
                    : "Generate grocery list"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Delete plan"
              aria-busy={isDeleting}
              disabled={isDeleting}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={displayedTab} className="w-full">
        <TabsContent value="plan">
          <PlanEditor
            planId={planId}
            initialPlan={initialPlan}
            recipes={plannerRecipes}
            ingredientOptions={ingredientOptions}
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
              familyMembers={familyMembers}
              plannerPool={logData.plannerPool}
              logId={logData.logId}
              familyMemberId={familyMemberId}
              recipeOptions={logData.recipeOptions}
              ingredientOptions={logData.ingredientOptions}
              plannedMealsBySlotKey={plannedMealsBySlotKey}
              dateRange={dateRange}
              allowDayManagement={false}
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
