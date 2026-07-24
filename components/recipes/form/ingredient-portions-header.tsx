"use client";

import type { UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
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
      {/* Batch size: sentence with shared QuantityStepper (preserves RHF null-on-clear). */}
      <FormField
        control={form.control}
        name="servings"
        render={({ field }) => (
          <FormItem>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 type-body text-muted-foreground">
              <span>Ingredient amounts below are for</span>
              <FormControl>
                <QuantityStepper
                  value={
                    typeof field.value === "number" &&
                    Number.isFinite(field.value)
                      ? field.value
                      : null
                  }
                  onValueChange={(next) => {
                    field.onChange(next);
                  }}
                  min={1}
                  ariaLabel="Number of portions"
                  decreaseLabel="Decrease portions"
                  increaseLabel="Increase portions"
                />
              </FormControl>
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
