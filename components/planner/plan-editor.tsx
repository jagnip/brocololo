"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlanInputType, SlotSaveData } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { toast } from "sonner";
import { updateSavedPlan } from "@/actions/planner-actions";

type PlanEditorProps = {
  planId: string;
  initialPlan: PlanInputType;
  recipes: RecipeType[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function PlanEditor({ planId, initialPlan, recipes }: PlanEditorProps) {
  const [plan, setPlan] = useState<PlanInputType>(initialPlan);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const hasEdited = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasEdited.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSaveStatus("idle");
    timeoutRef.current = setTimeout(async () => {
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
        setSaveStatus("error");
        toast.error(result.message);
      } else {
        setSaveStatus("saved");
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [plan, planId]);

  function markEdited<T extends unknown[]>(fn: (...args: T) => void) {
    return (...args: T) => {
      hasEdited.current = true;
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit plan</h1>
        <span className="text-sm text-muted-foreground">
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Failed to save"}
        </span>
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
