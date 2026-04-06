import { LogPage } from "@/components/log/log-page";
import { LogCurrentEmpty } from "@/components/log/log-current-empty";
import { LogTopbar } from "@/components/log/log-topbar";
import { findLogContainingDate, getLogsCached } from "@/lib/db/logs";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function LogCurrentPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; day?: string }>;
}) {
  const logs = await getLogsCached();
  const { person, day } = await searchParams;

  if (logs.length === 0) {
    return <LogCurrentEmpty />;
  }

  const today = new Date();
  // Prefer the log whose plan includes today; otherwise newest-created (getLogs order).
  const currentLog = findLogContainingDate(logs, today) ?? logs[0];
  // Default day tab to “today” when the URL has no ?day= (e.g. sidebar → Log).
  const dayForView = day ?? toDateKey(today);

  return (
    <>
      <LogTopbar logId={currentLog.id} />
      <div className="page-container">
        <LogPage logId={currentLog.id} person={person} day={dayForView} />
      </div>
    </>
  );
}
