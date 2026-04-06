import { LogPageSkeleton } from "@/components/log/log-page-skeleton";

/**
 * Log detail route loading UI. `AppTopbar` shows log control skeletons until
 * `LogTopbar` in the layout resolves.
 */
export default function LogDetailLoading() {
  return (
    <div className="page-container">
      <LogPageSkeleton />
    </div>
  );
}
