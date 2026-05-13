import { notFound } from "next/navigation";
import { GroceriesTopbarConfig } from "@/components/groceries/groceries-topbar-config";
import { getPlansCached } from "@/lib/db/planner";
import { getShoppingListByPlanId } from "@/lib/db/shopping-list";
import { formatDateRangeLabel } from "@/lib/format-date-range-label";

/** Server entry from `app/groceries/[planId]/layout.tsx` so the top bar persists across plan switches. */
export async function GroceriesTopbar({ planId }: { planId: string }) {
  const plans = await getPlansCached();
  const current = plans.find((p) => p.id === planId);
  if (!current) notFound();

  const list = await getShoppingListByPlanId(planId);
  const canEdit = !!(list && list.items.length > 0);

  const planDateRangeLabel = formatDateRangeLabel(
    new Date(current.startDate),
    new Date(current.endDate),
  );

  return (
    <GroceriesTopbarConfig
      planId={planId}
      planDateRangeLabel={planDateRangeLabel}
      canEdit={canEdit}
    />
  );
}
