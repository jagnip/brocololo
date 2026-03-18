import { formatDayLabel } from "@/lib/planner/helpers";
import type { LogDayData } from "@/lib/log/view-model";
import { LogSlotCard } from "./log-slot-card";

type LogDayViewProps = {
  days: LogDayData[];
};

export function LogDayView({ days }: LogDayViewProps) {
  if (days.length === 0) {
    return (
      <section className="rounded-lg border p-6 space-y-3">
        <h2 className="text-lg font-medium">No log entries for selected person</h2>
        <p className="text-sm text-muted-foreground">
          Switch person or create a plan to generate baseline log entries.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-8">
      {days.map((day) => (
        <article key={day.dateKey} className="space-y-4">
          <h2 className="text-base font-medium">{formatDayLabel(day.date)}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {day.slots.map((slot) => (
              <div key={`${day.dateKey}-${slot.mealType}`} className="space-y-2">
                <p className="text-sm text-muted-foreground">{slot.label}</p>
                <LogSlotCard slot={slot} />
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
