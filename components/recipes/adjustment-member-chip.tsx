"use client";

import { Badge } from "@/components/ui/badge";
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

/** Person name with optional portion / adjustment badges for personal adjustments UI. */
export function AdjustmentMemberChip({
  label,
  portionBadgeLabel,
  adjustmentBadgeLabel,
  onClick,
  className,
}: AdjustmentMemberChipProps) {
  const isInteractive = onClick != null;

  const content = (
    <>
      <span>{label}</span>
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
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 type-caption text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label={`Add adjustment for ${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
    >
      <span className="font-medium text-foreground">{label}</span>
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
    </span>
  );
}
