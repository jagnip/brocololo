"use client";

import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { FamilyMemberChecklist } from "./family-member-multi-select";
import { cn } from "@/lib/utils";

type SlotAudienceSelectProps = {
  familyMembers: FamilyMemberRow[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  disabled?: boolean;
  className?: string;
};

/** Compact people count on the card; checklist opens in a popover. */
export function SlotAudienceSelect({
  familyMembers,
  value,
  onChange,
  disabled = false,
  className,
}: SlotAudienceSelectProps) {
  const selectedCount = value.length;

  return (
    <div
      className={cn("shrink-0", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-9 gap-1 px-2.5"
            aria-label={`Cooking for ${selectedCount} ${selectedCount === 1 ? "person" : "people"}`}
          >
            <span className="text-sm font-medium tabular-nums">{selectedCount}</span>
            <User className="h-4 w-4" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1">
          <FamilyMemberChecklist
            familyMembers={familyMembers}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
