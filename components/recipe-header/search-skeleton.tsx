import { Skeleton } from "../ui/skeleton";

export default function SearchSkeleton() {
  return (
    <div className="flex items-center">
      <div className="rounded-lg border md:min-w-[450px] h-9">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}
