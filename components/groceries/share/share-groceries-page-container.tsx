import { notFound } from "next/navigation";
import { GroceriesPersistedList } from "@/components/groceries/groceries-persisted-list";
import { ShareGroceriesHeader } from "@/components/groceries/share/share-groceries-header";
import { getShoppingListById } from "@/lib/db/shopping-list";
import { resolvePublicShare } from "@/lib/db/shopping-list-share";
import { formatDateRangeLabel } from "@/lib/format-date-range-label";

type ShareGroceriesPageContainerProps = {
  token: string;
};

export async function ShareGroceriesPageContainer({
  token,
}: ShareGroceriesPageContainerProps) {
  const share = await resolvePublicShare(token);
  if (!share) {
    notFound();
  }

  const list = await getShoppingListById(share.shoppingListId);
  if (!list || list.items.length === 0) {
    notFound();
  }

  const dateRangeLabel = formatDateRangeLabel(
    new Date(share.planStartDate),
    new Date(share.planEndDate),
  );

  return (
    <>
      <ShareGroceriesHeader dateRangeLabel={dateRangeLabel} />
      <div className="page-container space-y-8 py-8">
        <GroceriesPersistedList list={list} shareToken={token} />
      </div>
    </>
  );
}
