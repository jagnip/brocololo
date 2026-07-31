"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import MultipleSelector from "@/components/ui/multiselect";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { cn } from "@/lib/utils";

export function getFamilyMemberLabel(
  member: FamilyMemberRow,
  index: number,
): string {
  return (
    member.name.trim() ||
    (member.isSelf ? "You" : `Family member ${index}`)
  );
}

/** Toggle a member id while enforcing at least one selected eater. */
export function toggleMemberIds(
  current: string[],
  memberId: string,
): string[] {
  const isSelected = current.includes(memberId);
  if (!isSelected) {
    return [...current, memberId];
  }
  const next = current.filter((id) => id !== memberId);
  // Each meal must include at least one person.
  return next.length === 0 ? current : next;
}

type FamilyMemberChecklistProps = {
  familyMembers: FamilyMemberRow[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  disabled?: boolean;
  className?: string;
};

/** Compact checklist with ticks for selected members — used on meal cards. */
export function FamilyMemberChecklist({
  familyMembers,
  value,
  onChange,
  disabled = false,
  className,
}: FamilyMemberChecklistProps) {
  const selectedIdSet = useMemo(() => new Set(value), [value]);

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {familyMembers.map((member, index) => {
        const isSelected = selectedIdSet.has(member.id);
        const label = getFamilyMemberLabel(member, index);

        return (
          <button
            key={member.id}
            type="button"
            disabled={disabled}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden transition-colors",
              "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
              isSelected && "bg-accent/60",
              disabled && "pointer-events-none opacity-50",
            )}
            onClick={() => onChange(toggleMemberIds(value, member.id))}
          >
            <span className="min-w-0 truncate">{label}</span>
            {isSelected ? (
              <Check className="size-4 shrink-0" aria-hidden />
            ) : (
              <span className="size-4 shrink-0" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

type FamilyMemberMultiSelectProps = {
  familyMembers: FamilyMemberRow[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

/** Multi-select for household members — selected people render as badges inside the control. */
export function FamilyMemberMultiSelect({
  familyMembers,
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select people",
}: FamilyMemberMultiSelectProps) {
  const options = useMemo(
    () =>
      familyMembers.map((member, index) => ({
        value: member.id,
        label: getFamilyMemberLabel(member, index),
      })),
    [familyMembers],
  );

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  return (
    <MultipleSelector
      value={selectedOptions}
      options={options}
      defaultOptions={options}
      disabled={disabled}
      placeholder={placeholder}
      hidePlaceholderWhenSelected
      emptyIndicator={
        <p className="text-center text-sm text-muted-foreground">
          No family members
        </p>
      }
      onChange={(selected) => {
        const nextIds = selected.map((option) => option.value);
        // Each meal row must include at least one person.
        if (nextIds.length === 0) {
          return;
        }
        onChange(nextIds);
      }}
      className={cn("w-full", className)}
    />
  );
}
