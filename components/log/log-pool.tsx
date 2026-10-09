"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PlannerPoolGroupedCardData } from "@/lib/log/view-model";
import { LogPlannerPoolCard } from "./log-planner-pool-card";
import { Subheader } from "../recipes/recipe-page/subheader";

type LogPlannerPoolProps = {
  items: PlannerPoolGroupedCardData[];
};

export function LogPool({ items }: LogPlannerPoolProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  // Tight spacing under subheader; aligns with Log block row gap (gap-y-2).
  return (
    <Collapsible
      asChild
      open={!isMobile || isExpanded}
      onOpenChange={setIsExpanded}
    >
      <section className="space-y-2">
        <Subheader>
          {isMobile ? (
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="h-auto min-h-11 w-full justify-between whitespace-normal rounded-xl bg-card p-3 text-left text-card-foreground shadow-sm"
              >
                <span className="type-h2">Planned meals</span>
                <ChevronDown
                  aria-hidden="true"
                  className={isExpanded ? "size-4 rotate-180" : "size-4"}
                />
              </Button>
            </CollapsibleTrigger>
          ) : (
            "Planned meals"
          )}
        </Subheader>
        <CollapsibleContent>
          {/* md–2xl: four columns (¼ width) when pool is full-width; 2xl sidebar stacks one column. */}
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">
              No planner meals left in pool.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-1">
              {items.map((item) => (
                <LogPlannerPoolCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
