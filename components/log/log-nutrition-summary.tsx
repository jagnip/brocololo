import { Card, CardContent } from "@/components/ui/card";

type LogNutritionSummaryProps = {
  label: string;
  metrics: Array<{ label: string; value: string }>;
};

export function LogNutritionSummary({ label, metrics }: LogNutritionSummaryProps) {
  return (
    <Card role="region" aria-label={label} className="gap-0 overflow-hidden py-0 shadow-rose-sm">
      <CardContent className="grid grid-cols-2 p-0 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="border-border px-4 py-4 even:border-l [&:nth-child(-n+2)]:border-b sm:border-b-0 sm:border-l sm:first:border-l-0"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {metric.value}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
