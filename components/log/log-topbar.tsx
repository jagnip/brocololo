import { cache } from "react";
import { notFound } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { getLogById, getLogsCached } from "@/lib/db/logs";
import { formatDateRangeLabel } from "@/lib/format-date-range-label";
import { LogTopbarConfig } from "@/components/log/log-topbar-config";

/** Loads log list + current log for the app top bar; PRIMARY is enough for plan id / selector labels. */
const loadLogTopbarData = cache(async (logId: string) => {
  const [log, allLogs] = await Promise.all([
    getLogById(logId, LogPerson.PRIMARY),
    getLogsCached(),
  ]);
  return { log, allLogs };
});

/** Server entry mounted from `app/log/[logId]/layout.tsx` so the top bar survives client navigations between logs. */
export async function LogTopbar({ logId }: { logId: string }) {
  const { log, allLogs } = await loadLogTopbarData(logId);
  if (!log) notFound();

  const logOptions = allLogs.map((entry) => ({
    id: entry.id,
    label: formatDateRangeLabel(entry.plan.startDate, entry.plan.endDate),
  }));

  return (
    <LogTopbarConfig planId={log.plan.id} logOptions={logOptions} logId={logId} />
  );
}
