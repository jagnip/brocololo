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

export default async function LogCurrentPage() {
  const logs = await getLogs();
  if (logs.length === 0) {
    redirect(ROUTES.log);
  }

  const today = new Date();
  const targetLog = logs.find((log) =>
    isWithinDateRange(today, log.plan.startDate, log.plan.endDate),
  ) ?? logs[0];

  redirect(`${ROUTES.logView(targetLog.id)}?day=${toDateKey(today)}`);
}
