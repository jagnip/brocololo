import { Skeleton } from "../ui/skeleton";

export default function CategorySkeleton() {
  return (
    <header className="flex flex-wrap gap-2 sticky top-0 z-10 bg-background py-4 px-4 w-full">
      <Skeleton className="h-10 w-16 rounded-lg bg-muted" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-32 rounded-lg bg-muted" />
      ))}
    </header>
  );
}