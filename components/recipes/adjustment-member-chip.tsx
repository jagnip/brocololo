"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdjustmentMemberChipProps = {
  label: string;
  /** Recipe portion badge, e.g. ×2 — omitted when null. */
  portionBadgeLabel?: string | null;
  /** View-only adjustment type badge. */
  adjustmentBadgeLabel?: "Custom" | "Skipped" | null;
  /** When set, the chip is a button that adds/opens an adjustment for this person. */
  onClick?: () => void;
  className?: string;
};

/**
 * Person name with optional portion / adjustment badges.
 * Interactive: outline Button (same family as Cooking for / Modify–Skip).
 * Read-only: plain text + badges for summary views.
 */
export function AdjustmentMemberChip({
  label,
  portionBadgeLabel,
  adjustmentBadgeLabel,
  onClick,
  className,
}: AdjustmentMemberChipProps) {
  const isInteractive = onClick != null;

  // Shared trailing badges for portion / adjustment type.
  const trailingBadges = (
    <>
      {portionBadgeLabel ? (
        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium">
          {portionBadgeLabel}
        </Badge>
      ) : null}
      {adjustmentBadgeLabel ? (
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
          {adjustmentBadgeLabel}
        </Badge>
      ) : null}
    </>
  );

  if (isInteractive) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        aria-label={`Add adjustment for ${label}`}
        className={cn(className)}
      >
        {label}
        {trailingBadges}
      </Button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="font-medium text-foreground">{label}</span>
      {trailingBadges}
    </span>
  );
}
