"use client";

import { Button } from "@/components/ui/button";

type PlannerBulkActionsFooterProps = {
  selectedCount: number;
  onDone: () => void;
};

export function PlannerBulkActionsFooter({
  selectedCount,
  onDone,
}: PlannerBulkActionsFooterProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="sticky bottom-3 z-10 mt-4">
      {/* Keep this surface aligned with card/Quick add styling instead of modal chrome. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
        <p className="text-sm font-medium text-foreground">
          {selectedCount} slot{selectedCount === 1 ? "" : "s"} selected
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            Shuffle
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            Add/Edit meals
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            Remove meals
          </Button>
          <Button type="button" variant="default" size="sm" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
