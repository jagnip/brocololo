import { Card } from "@/components/ui/card";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { Plus, SearchX } from "lucide-react";

type PlannerPlanColumnEmptyProps = {
  variant: "idle" | "failure";
  className?: string;
};

export function PlannerPlanColumnEmpty({
  variant,
  className,
}: PlannerPlanColumnEmptyProps) {
  const isFailure = variant === "failure";
  const title = isFailure
    ? MESSAGES.planner.generationFailedTitle
    : MESSAGES.planner.planColumnIdleTitle;
  const subtitle = isFailure
    ? MESSAGES.planner.generationFailedSubtitle
    : MESSAGES.planner.planColumnIdleSubtitle;

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-dashed border-border bg-muted/50 p-0 py-0 shadow-none",
        className,
      )}
    >
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-3 text-center">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
          aria-hidden
        >
          {isFailure ? (
            <SearchX className="size-3" />
          ) : (
            <Plus className="size-3" />
          )}
        </span>
        <p className="max-w-sm text-sm font-medium leading-snug text-foreground">
          {title}
        </p>
        <span className="max-w-sm text-xs text-muted-foreground">{subtitle}</span>
      </div>
    </Card>
  );
}
