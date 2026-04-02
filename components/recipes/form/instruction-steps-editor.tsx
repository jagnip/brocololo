"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
          className="border rounded-md p-3 space-y-2"
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

          <Button type="button" variant="ghost" onClick={() => removeStep(index)}>
            Remove step
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addStep}>
        Add step
      </Button>
    </div>
  );
}
