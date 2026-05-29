import { LogPageSkeleton } from "@/components/log/log-page-skeleton";

/**
 * Same shell as `/log/[logId]` while resolving which log id to show.
 * Top bar skeleton is handled globally for `/log/*` detail routes.
 */
export default function LogCurrentLoading() {
  return (
    <div className="page-container">
      <LogPageSkeleton />
    </div>
  );
}
