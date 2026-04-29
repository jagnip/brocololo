import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { findLogContainingDate, getLogsCached } from "@/lib/db/logs";

export default async function LogCurrentPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; day?: string }>;
}) {
  const logs = await getLogsCached();
  const { person } = await searchParams;

  const today = new Date();
  const currentLog = findLogContainingDate(logs, today) ?? logs[0];
  if (!currentLog) {
    // Fall back to planner current resolver when there is no legacy log record.
    redirect(`${ROUTES.planCurrent}?tab=log`);
  }

  const params = new URLSearchParams();
  params.set("tab", "log");
  if (person) {
    params.set("person", person);
  }
  redirect(`${ROUTES.planView(currentLog.plan.id)}?${params.toString()}`);
}
