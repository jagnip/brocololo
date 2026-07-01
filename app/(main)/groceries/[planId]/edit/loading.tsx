import { GroceriesEditSkeleton } from "@/components/groceries/groceries-edit-skeleton";

export default function Loading() {
  // Dedicated skeleton for groceries edit route transitions.
  return (
    <div className="min-w-0 w-full max-w-full pb-gutter pt-0">
      <GroceriesEditSkeleton />
    </div>
  );
}
