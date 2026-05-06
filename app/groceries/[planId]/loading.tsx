import { GroceriesPlanSkeleton } from "@/components/groceries/groceries-plan-skeleton";

export default function Loading() {
  // Dedicated skeleton for groceries plan detail route.
  return (
    <div className="page-container space-y-8 py-8">
      <GroceriesPlanSkeleton />
    </div>
  );
}
