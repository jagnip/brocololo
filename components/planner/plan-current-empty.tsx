import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function PlanCurrentEmpty() {
  return (
    <div className="page-container">
      <section
        className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xs"
        aria-labelledby="plan-empty-heading"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h1 id="plan-empty-heading" className="text-lg font-semibold tracking-tight">
              No plans yet
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create your first plan to start scheduling meals.
          </p>
          <div>
            <Button asChild>
              <Link href={ROUTES.planCreate}>Create new plan</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
