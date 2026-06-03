import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { findLogContainingDate, getLogsCached } from "@/lib/db/logs";
import { requireUser } from "@/lib/auth/session";

export default async function LogCurrentPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string; day?: string }>;
}) {
  const { id: userId } = await requireUser();
  const logs = await getLogsCached(userId);
  const { memberId } = await searchParams;

  const today = new Date();
  const currentLog = findLogContainingDate(logs, today) ?? logs[0];
  if (!currentLog) {
    // Fall back to planner current resolver when there is no legacy log record.
    redirect(`${ROUTES.planCurrent}?tab=log`);
  }

  const params = new URLSearchParams();
  params.set("tab", "log");
  if (memberId) {
    params.set("memberId", memberId);
  }
  redirect(`${ROUTES.planView(currentLog.plan.id)}?${params.toString()}`);
}
