"use client";

import type { PlannerPoolGroupedCardData } from "@/lib/log/view-model";
import { LogPlannerPoolCard } from "./log-planner-pool-card";

type LogPlannerPoolProps = {
  items: PlannerPoolGroupedCardData[];
};

export function LogPool({ items }: LogPlannerPoolProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Planned meals</h3>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No planner meals left in pool.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {items.map((item) => (
            <LogPlannerPoolCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
