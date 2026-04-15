"use client";

import { Card } from "@/components/ui/card";

type PlannerPoolPlaceholderProps = {
  className?: string;
};

export function PlannerPoolPlaceholder({ className }: PlannerPoolPlaceholderProps) {
  return (
    <Card className={`flex min-h-[170px] flex-col gap-3 rounded-lg border border-dashed bg-card p-4 shadow-none xl:min-h-[220px] ${className ?? ""}`}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Recipe pool</h3>
        <p className="text-xs text-muted-foreground">
          Placeholder for draggable recipe cards.
        </p>
      </div>
      <div className="h-9 rounded-md border border-border bg-background" />
      {/* Pool is horizontally scrollable, so we keep it shallow instead of tall. */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        onWheel={(event) => {
          // Treat vertical wheel as horizontal scrolling while hovering the pool.
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          const container = event.currentTarget;
          if (container.scrollWidth <= container.clientWidth) return;
          container.scrollLeft += event.deltaY;
          event.preventDefault();
        }}
      >
        <div className="h-16 min-w-[220px] rounded-md border border-border/80 bg-background" />
        <div className="h-16 min-w-[220px] rounded-md border border-border/80 bg-background" />
        <div className="h-16 min-w-[220px] rounded-md border border-border/80 bg-background" />
        <div className="h-16 min-w-[220px] rounded-md border border-border/80 bg-background" />
      </div>
    </Card>
  );
}
