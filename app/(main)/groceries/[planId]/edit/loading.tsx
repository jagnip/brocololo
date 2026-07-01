import { GroceriesEditSkeleton } from "@/components/groceries/groceries-edit-skeleton";

export default function Loading() {
  // Dedicated skeleton for groceries edit route transitions.
  return (
    <div className="w-full px-gutter pb-gutter pt-gutter lg:pt-0">
      <GroceriesEditSkeleton />
    </div>
  );
}
