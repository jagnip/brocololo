"use client";

import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Check, ChevronsUpDown, Minus, Plus } from "lucide-react";
import type { CreateRecipeFormValues } from "@/lib/validations/recipe";
import { PORTION_SIZE_PRESETS } from "@/lib/validations/recipe";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { syncModifyAmountsToPortionMultipliers } from "@/lib/recipes/sync-modify-amounts-for-portions";
import type { MemberPortionInput } from "@/lib/recipes/ingredient-adjustments";
import { cn } from "@/lib/utils";

function normalizeMemberPortionRows(
  rows: CreateRecipeFormValues["memberPortions"] | undefined,
): MemberPortionInput[] {
  return (rows ?? []).map((row) => ({
    familyMemberId: row.familyMemberId,
    multiplier:
      typeof row.multiplier === "number" && Number.isFinite(row.multiplier)
        ? row.multiplier
        : 1,
  }));
}

/** Compact display for the selected multiplier (e.g. ×0.5, ×1, ×2). */
function formatMultiplierDisplay(multiplier: number): string {
  return `×${multiplier}`;
}

type IngredientPortionsHeaderProps = {
  form: UseFormReturn<CreateRecipeFormValues>;
  familyMembers: FamilyMemberRow[];
};

/**
 * Portions controls embedded above the ingredient list:
 * batch size stepper + per-person size menus.
 */
export function IngredientPortionsHeader({
  form,
  familyMembers,
}: IngredientPortionsHeaderProps) {
  const servings = useWatch({ control: form.control, name: "servings" });

  const numericServings =
    typeof servings === "number" && Number.isFinite(servings) ? servings : null;

  function setServings(next: number) {
    form.setValue("servings", next, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function stepServings(delta: number) {
    const current =
      typeof servings === "number" && Number.isFinite(servings) ? servings : 1;
    // Clamp at 1 — a recipe always covers at least one portion.
    setServings(Math.max(1, current + delta));
  }

  function applyMemberPortionsChange(nextPortions: MemberPortionInput[]) {
    form.setValue("memberPortions", nextPortions, {
      shouldValidate: true,
      shouldDirty: true,
    });

    const currentServings = form.getValues("servings");
    const servingsForSync =
      typeof currentServings === "number" && Number.isFinite(currentServings)
        ? currentServings
        : 1;
    const currentIngredients = form.getValues("ingredients") ?? [];
    // Keep MODIFY amounts aligned with the new multipliers (batch ÷ servings × multiplier).
    const syncedIngredients = syncModifyAmountsToPortionMultipliers(
      currentIngredients,
      nextPortions,
      servingsForSync,
    );
    form.setValue("ingredients", syncedIngredients, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  return (
    <div className="mb-3 flex flex-col gap-3">
      {/* Batch size: sentence with inline [-] N [+] stepper. */}
      <FormField
        control={form.control}
        name="servings"
        render={({ field }) => (
          <FormItem>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 type-body text-muted-foreground">
              <span>Ingredient amounts below are for</span>
              <div className="inline-flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Decrease portions"
                  disabled={numericServings != null && numericServings <= 1}
                  onClick={() => stepServings(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    step={1}
                    aria-label="Number of portions"
                    // Hide the native number spinner (WebKit + Firefox) — the −/+ buttons replace it.
                    className="h-8 w-14 text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={(field.value as number | undefined) ?? ""}
                    onChange={(event) => {
                      // Keep cleared values as null so RHF validation can re-trigger.
                      const rawValue = event.target.value;
                      const nextValue =
                        rawValue === "" ? null : Number(rawValue);
                      field.onChange(nextValue);
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Increase portions"
                  onClick={() => stepServings(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span>
                <span className="font-bold">default</span> portions
              </span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Per-person portion size: DropdownMenu (not Select) so custom Name ×N triggers open reliably. */}
      <FormField
        control={form.control}
        name="memberPortions"
        render={({ field }) => (
          <FormItem>
            <FormLabel
              className="text-muted-foreground"
              tooltip="Relative to 1 default portion. Example: ×2 = twice that amount for this person."
              tooltipAriaLabel="Show portion adjustment guidance"
            >
              Scale default portion
            </FormLabel>
            {/* Description for tablet/mobile only — desktop uses the label tooltip. */}
            <FormDescription className="lg:hidden">
              Relative to 1 default portion. Example: ×2 = twice that amount for
              this person.
            </FormDescription>
            <div className="flex min-w-0 flex-wrap gap-2">
              {familyMembers.map((member, index) => {
                const currentPortions = normalizeMemberPortionRows(field.value);
                const selectedMultiplier =
                  currentPortions.find(
                    (portion) => portion.familyMemberId === member.id,
                  )?.multiplier ?? 1;
                const label =
                  member.name.trim() ||
                  (member.isSelf ? "You" : `Family member ${index + 1}`);
                const displayMultiplier = PORTION_SIZE_PRESETS.some(
                  (preset) => preset.multiplier === selectedMultiplier,
                )
                  ? selectedMultiplier
                  : 1;

                return (
                  <DropdownMenu key={member.id}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        aria-label={`${label} portion size`}
                        // Match Select selected-value color (outline default is secondary-foreground).
                        className="max-w-full gap-1.5 text-foreground"
                      >
                        <span className="truncate">
                          {label}
                          <span className="ml-1.5 tabular-nums text-muted-foreground">
                            {formatMultiplierDisplay(displayMultiplier)}
                          </span>
                        </span>
                        <ChevronsUpDown className="size-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-40">
                      {PORTION_SIZE_PRESETS.map((preset) => {
                        const isSelected =
                          preset.multiplier === displayMultiplier;
                        return (
                          <DropdownMenuItem
                            key={preset.multiplier}
                            // Keep menu keyboard semantics; apply change on select.
                            onSelect={() => {
                              const withoutMember = currentPortions.filter(
                                (portion) =>
                                  portion.familyMemberId !== member.id,
                              );
                              applyMemberPortionsChange([
                                ...withoutMember,
                                {
                                  familyMemberId: member.id,
                                  multiplier: preset.multiplier,
                                },
                              ]);
                            }}
                          >
                            <span className="flex w-full items-center justify-between gap-4">
                              <span className="flex items-center gap-2">
                                <Check
                                  className={cn(
                                    "size-4",
                                    isSelected ? "opacity-100" : "opacity-0",
                                  )}
                                  aria-hidden
                                />
                                {preset.label}
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {formatMultiplierDisplay(preset.multiplier)}
                              </span>
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
