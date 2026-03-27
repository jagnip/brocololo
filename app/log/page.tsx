import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { getLogs } from "@/lib/db/logs";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWithinDateRange(date: Date, start: Date, end: Date) {
  const targetKey = toDateKey(date);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return targetKey >= startKey && targetKey <= endKey;
}

export default async function LogPage() {
  const logs = await getLogs();
  if (logs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Log</h1>
        </header>

        <section className="rounded-lg border p-6 space-y-3">
          <h2 className="text-lg font-medium">No logs yet</h2>
          <p className="text-sm text-muted-foreground">
            Logs are created when a plan is saved.
          </p>
        </section>
      </div>
    );
  }

  const today = new Date();
  // Prefer the active period for today; fallback to first available log.
  const targetLog = logs.find((log) =>
    isWithinDateRange(today, log.plan.startDate, log.plan.endDate),
  ) ?? logs[0];
  const todayKey = toDateKey(today);

  redirect(`${ROUTES.logView(targetLog.id)}?day=${todayKey}`);
}
