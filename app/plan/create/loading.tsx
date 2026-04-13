import { PlannerFormSkeleton } from "@/components/planner/planner-form-skeleton";

export default function Loading() {
  // Same outer shell as `app/plan/create/page.tsx` while `PlannerFormContainer` resolves.
  return (
    <div className="page-container">
      <PlannerFormSkeleton />
    </div>
  );
}
