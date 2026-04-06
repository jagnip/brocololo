"use client";

import { DeleteLogButton } from "@/components/log/delete-log-button";
import { LogPersonSelectFromUrl } from "@/components/log/log-person-select";
import { LogSelect, type LogSelectOption } from "@/components/log/log-select";

type LogTopbarControlsProps = {
  logOptions: LogSelectOption[];
  logId: string;
};

/** Top bar controls specific to log detail pages: log switcher, person, delete, (view plan is an action in `LogTopbarConfig`). */
export function LogTopbarControls({ logOptions, logId }: LogTopbarControlsProps) {
  return (
    // Allow child controls (especially selects) to shrink on small screens.
    <div className="flex min-w-0 items-center gap-2">
      <LogSelect logs={logOptions} currentLogId={logId} />
      <LogPersonSelectFromUrl />
      <DeleteLogButton logId={logId} />
    </div>
  );
}

