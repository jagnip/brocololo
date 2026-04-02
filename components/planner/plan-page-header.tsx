import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { PlanSelect, type PlanSelectOption } from "./plan-select";

type PlanPageHeaderProps = {
  planOptions: PlanSelectOption[];
  planId: string;
};

export function PlanPageHeader({ planOptions, planId }: PlanPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <PlanSelect plans={planOptions} currentPlanId={planId} />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* Match topbar: secondary visual weight for “create another plan” next to the selector. */}
        <Button asChild variant="outline">
          <Link href={ROUTES.planCreate}>
            New plan
          </Link>
        </Button>
      </div>
    </header>
  );
}
