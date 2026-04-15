"use client";

import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type PlannerPoolProps = {
  className?: string;
};

const POOL_PLACEHOLDER_RECIPES = [
  { name: "Harissa Chickpea Bowl", handsOn: "20 min" },
  { name: "Lemon Salmon Tray Bake", handsOn: "25 min" },
  { name: "Creamy Mushroom Pasta", handsOn: "18 min" },
  { name: "Turkey & Bean Chili", handsOn: "22 min" },
];

export function PlannerPool({ className }: PlannerPoolProps) {
  return (
    <section className={`space-y-2 lg:h-[calc(100vh-6rem)] ${className ?? ""}`}>
      <div className="space-y-1">
        <Subheader>Planned meals</Subheader>
        <p className="text-xs text-muted-foreground">Placeholder cards for drag-and-drop preview.</p>
      </div>
      {/* Match log pool column behavior while keeping placeholders local to planner create. */}
      <div
        className="flex max-h-[calc(100%-2.75rem)] flex-col gap-2 overflow-y-auto pb-1"
        onWheel={(event) => {
          // Keep wheel scrolling contained in the pool list.
          const container = event.currentTarget;
          if (container.scrollHeight > container.clientHeight) {
            container.scrollTop += event.deltaY;
            event.preventDefault();
          }
        }}
      >
        {/* Match log card structure; only content is placeholder. */}
        {POOL_PLACEHOLDER_RECIPES.map((recipe) => (
          <Card
            key={recipe.name}
            className="flex cursor-grab flex-row items-stretch gap-0 overflow-hidden p-0 active:cursor-grabbing"
          >
            {/* Keep 1/4 media rail to mirror log planned-meals cards. */}
            <div className="relative w-1/4 shrink-0 basis-1/4 self-stretch overflow-hidden bg-muted">
              <div
                className="absolute inset-0 bg-linear-to-br from-muted via-muted to-muted-foreground/25"
                aria-hidden
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">
              <p className="truncate text-sm font-medium text-foreground">{recipe.name}</p>
              <Badge variant="outline" className="w-fit text-xs tabular-nums">
                {recipe.handsOn}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
