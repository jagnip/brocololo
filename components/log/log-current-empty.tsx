import { CalendarDays } from "lucide-react";

export function LogCurrentEmpty() {
  return (
    <div className="page-container">
      <section
        className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xs"
        aria-labelledby="log-empty-heading"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="h-5 w-5 text-muted-foreground"
              aria-hidden
            />
            <h1
              id="log-empty-heading"
              className="text-lg font-semibold tracking-tight"
            >
              No logs yet
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Logs are created when you generate them from a saved planner plan.
          </p>
        </div>
      </section>
    </div>
  );
}
