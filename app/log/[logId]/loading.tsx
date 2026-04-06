import { LogPageSkeleton } from "@/components/log/log-page-skeleton";

/**
 * Log detail route loading UI. `AppTopbar` shows log control skeletons until
 * `LogTopbarConfig` hydrates from the page RSC.
 */
export default function LogDetailLoading() {
  return (
    <div className="page-container">
      <LogPageSkeleton />
    </div>
  );
}
