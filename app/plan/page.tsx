import { redirect } from "next/navigation";
import { getLatestPlanId } from "@/lib/db/planner";
import { ROUTES } from "@/lib/constants";

export default async function PlannerPage() {
  const latestPlanId = await getLatestPlanId();

  if (latestPlanId) {
    redirect(ROUTES.planView(latestPlanId));
  }

  redirect(ROUTES.planCreate);
}
