import { Breadcrumbs } from "@/components/ui/breadcrumbs";

type ShareGroceriesHeaderProps = {
  dateRangeLabel: string;
};

/** Matches app top bar chrome with a single date-range crumb (no sidebar). */
export function ShareGroceriesHeader({ dateRangeLabel }: ShareGroceriesHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background px-4">
      <Breadcrumbs items={[{ label: dateRangeLabel }]} />
    </header>
  );
}
