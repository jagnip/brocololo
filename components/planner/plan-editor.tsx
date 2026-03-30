"use client";

import { useCallback, useRef, useState } from "react";
import { PlanInputType, SlotSaveData } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { generateLogFromPlan, updateSavedPlan } from "@/actions/planner-actions";

type PlanEditorProps = {
  planId: string;
  initialPlan: PlanInputType;
  recipes: RecipeType[];
};

type SaveStatus = "idle" | "saving";

export function PlanEditor({ planId, initialPlan, recipes }: PlanEditorProps) {
  const [plan, setPlan] = useState<PlanInputType>(initialPlan);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const editVersionRef = useRef(0);
  const router = useRouter();
  const [logStatus, setLogStatus] = useState<"idle" | "generating">("idle");

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    if (saveStatus === "saving") return;

    const saveEditVersion = editVersionRef.current;
    setSaveStatus("saving");

    const saveData: SlotSaveData[] = plan.map((s) => ({
      date: new Date(s.date),
      mealType: s.mealType,
      recipeId: s.recipe?.id ?? null,
      alternativeRecipeIds: s.alternatives.map((a) => a.id),
      used: s.used,
    }));

    const result = await updateSavedPlan(planId, saveData);
    if (result.type === "error") {
      setSaveStatus("idle");
      toast.error(result.message);
      return;
    }

    setSaveStatus("idle");
    if (saveEditVersion === editVersionRef.current) {
      setIsDirty(false);
    }
  }, [isDirty, plan, planId, saveStatus]);

  function markEdited<T extends unknown[]>(fn: (...args: T) => void) {
    return (...args: T) => {
      editVersionRef.current += 1;
      setIsDirty(true);
      fn(...args);
    };
  }

  const handleShuffle = useCallback((slotKey: string) => {
    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey || !slot.recipe || slot.alternatives.length === 0) return slot;
        const [nextRecipe, ...restAlternatives] = slot.alternatives;
        return {
          ...slot,
          recipe: nextRecipe,
          alternatives: [...restAlternatives, slot.recipe],
        };
      }),
    );
  }, []);

  const handleReplace = useCallback((slotKey: string, newRecipe: RecipeType) => {
    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return {
          ...slot,
          recipe: newRecipe,
          alternatives: slot.alternatives.filter((r) => r.id !== newRecipe.id),
        };
      }),
    );
  }, []);

  const handleRemove = useCallback((slotKey: string) => {
    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return { ...slot, recipe: null };
      }),
    );
  }, []);

  const handleToggleUsed = useCallback((slotKey: string) => {
    setPlan((prev) =>
      prev.map((slot) => {
        const key = `${slot.date.toISOString()}-${slot.mealType}`;
        if (key !== slotKey) return slot;
        return { ...slot, used: !slot.used };
      }),
    );
  }, []);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Edit plan</h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!isDirty || saveStatus === "saving"}
            aria-busy={saveStatus === "saving"}
            onClick={() => {
              void handleSave();
            }}
          >
            {saveStatus === "saving" ? "Saving..." : "Save"}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isDirty || saveStatus === "saving" || logStatus === "generating"}
            aria-busy={logStatus === "generating"}
            onClick={async () => {
              if (isDirty) {
                toast.info("Save your plan before generating a log.");
                return;
              }

              setLogStatus("generating");
              try {
                const result = await generateLogFromPlan(planId);
                if (result.type === "already_exists") {
                  toast.info("Log already generated for this plan.");
                  return;
                }
                if (result.type === "error") {
                  toast.error(result.message);
                  return;
                }

                router.push(ROUTES.logView(result.logId));
              } finally {
                setLogStatus("idle");
              }
            }}
          >
            {logStatus === "generating" ? "Generating log..." : "Generate log"}
          </Button>
        </div>
      </div>
      <PlanView
        plan={plan}
        recipes={recipes}
        onShuffle={markEdited(handleShuffle)}
        onReplace={markEdited(handleReplace)}
        onRemove={markEdited(handleRemove)}
        onToggleUsed={markEdited(handleToggleUsed)}
      />
    </>
  );
}
