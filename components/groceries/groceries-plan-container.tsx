import { notFound } from "next/navigation";
import { getPlanForGroceries } from "@/lib/db/planner";
import { GroceriesContainer } from "./groceries-container";

type GroceriesPlanContainerProps = {
  planId: string;
};

export async function GroceriesPlanContainer({
  planId,
}: GroceriesPlanContainerProps) {
  // Keep page.tsx thin by loading data in the container.
  const plan = await getPlanForGroceries(planId);

  if (!plan) {
    notFound();
  }

  return <GroceriesContainer plan={plan} />;
}
