import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { getLogs } from "@/lib/db/logs";
import { Button } from "@/components/ui/button";

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

export default async function LogPage() {
  const logs = await getLogs();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Log</h1>
      </header>

      {logs.length === 0 ? (
        <section className="rounded-lg border p-6 space-y-3">
          <h2 className="text-lg font-medium">No logs yet</h2>
          <p className="text-sm text-muted-foreground">
            Logs are created when you generate them from a saved planner plan.
          </p>
        </section>
      ) : (
        <ul className="rounded-lg border divide-y">
          {logs.map((log) => {
            const label = formatDateRange(log.plan.startDate, log.plan.endDate);
            return (
              <li key={log.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={ROUTES.logView(log.id)}>Open</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
