"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

type IngredientOption = {
  tempIngredientKey: string;
  label: string;
};

type InstructionStepValue = {
  id?: string;
  text: string;
  linkedTempIngredientKeys?: string[];
};

type InstructionStepsEditorProps = {
  value: InstructionStepValue[];
  onChange: (value: InstructionStepValue[]) => void;
  ingredientOptions: IngredientOption[];
};

export function InstructionStepsEditor({
  value,
  onChange,
  ingredientOptions,
}: InstructionStepsEditorProps) {
  const addStep = () => {
    // New step starts without ingredient links by default.
    onChange([...value, { text: "", linkedTempIngredientKeys: [] }]);
  };

  const updateStep = (index: number, patch: Partial<InstructionStepValue>) => {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeStep = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const toggleIngredientLink = (index: number, key: string) => {
    const step = value[index];
    const linkedKeys = step.linkedTempIngredientKeys ?? [];
    const isLinked = linkedKeys.includes(key);

    updateStep(index, {
      linkedTempIngredientKeys: isLinked
        ? linkedKeys.filter((existing) => existing !== key)
        : [...linkedKeys, key],
    });
  };

  return (
    <div className="space-y-3">
      {value.map((step, index) => (
        <div
          key={step.id ?? `new-step-${index}`}
          // Match ingredient-row container spacing so both editors feel consistent.
          className="border rounded-md p-2 space-y-2"
        >
          <Textarea
            value={step.text}
            onChange={(e) => updateStep(index, { text: e.target.value })}
            placeholder={`Step ${index + 1}`}
          />

          <div className="flex flex-wrap gap-2">
            {/* Selected state is expressed by button variant only (no duplicate badge list). */}
            {ingredientOptions.map((option) => {
              const selected = (step.linkedTempIngredientKeys ?? []).includes(
                option.tempIngredientKey,
              );

              return (
                <Button
                  key={option.tempIngredientKey}
                  type="button"
                  size="default"
                  variant={selected ? "default" : "outline"}
                  onClick={() =>
                    toggleIngredientLink(index, option.tempIngredientKey)
                  }
                >
                  {option.label}
                </Button>
              );
            })}
          </div>

          {/* Keep destructive affordance compact and consistent with other icon-only row actions. */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Remove step ${index + 1}`}
            onClick={() => removeStep(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addStep}
        className={value.length === 0 ? "mt-3" : undefined}
      >
        Add step
      </Button>
    </div>
  );
}
