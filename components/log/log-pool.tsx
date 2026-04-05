"use client";

import type { PlannerPoolGroupedCardData } from "@/lib/log/view-model";
import { LogPlannerPoolCard } from "./log-planner-pool-card";
import { Subheader } from "../recipes/recipe-page/subheader";

type LogPlannerPoolProps = {
  items: PlannerPoolGroupedCardData[];
};

export function LogPool({ items }: LogPlannerPoolProps) {
  // Tight spacing under subheader; aligns with Log block row gap (gap-y-2).
  return (
    <section className="space-y-2">
      <Subheader>Planned meals</Subheader>
      {/* md–2xl: four columns (¼ width) when pool is full-width; 2xl sidebar stacks one column. */}
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No planner meals left in pool.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-1">
          {items.map((item) => (
            <LogPlannerPoolCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
