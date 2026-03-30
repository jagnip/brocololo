"use client";

import { useCallback, useRef, useState } from "react";
import { PlanInputType, SlotSaveData } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { toast } from "sonner";
import { updateSavedPlan } from "@/actions/planner-actions";
import { Button } from "@/components/ui/button";

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
