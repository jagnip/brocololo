"use client";

type PortionSplitCardProps = {
  jagodaPortionFactor: number;
  nelsonPortionFactor: number;
  nelsonMultiplier: number;
};

export function PortionSplitCard({
  jagodaPortionFactor,
  nelsonPortionFactor,
  nelsonMultiplier,
}: PortionSplitCardProps) {
  // Keep percentages stable and human-readable in UI.
  const jagodaPct = Math.round(jagodaPortionFactor * 100);
  const nelsonPct = 100 - jagodaPct;

  // Keep ratio format aligned with product wording in the recipe page.
  const ratioText = `1 : ${nelsonMultiplier}`;

  // Conic gradient gives us a lightweight two-part pie without chart libraries.
  const pieBackground = `conic-gradient(
    var(--muted-foreground) 0% ${jagodaPct}%,
    var(--foreground) ${jagodaPct}% 100%
  )`;

  return (
    <div className="mb-item rounded-lg border border-border bg-muted p-nest">
      <div className="flex items-center gap-item">
        <div
          className="relative size-10 shrink-0 rounded-full border border-border"
          style={{ backgroundImage: pieBackground }}
          aria-hidden="true"
        />

        <div className="min-w-0">
          <div className="type-body font-semibold text-foreground">{ratioText}</div>
          <div className="type-caption text-muted-foreground">
            Jagoda {jagodaPct}% / Nelson {nelsonPct}%
          </div>
        </div>
      </div>
    </div>
  );
}
