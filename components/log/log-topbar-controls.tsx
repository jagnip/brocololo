"use client";

import { DeleteLogButton } from "@/components/log/delete-log-button";
import { LogSelect, type LogSelectOption } from "@/components/log/log-select";

type LogTopbarControlsProps = {
  logOptions: LogSelectOption[];
  logId: string;
};

/** Top bar controls specific to log detail pages. */
export function LogTopbarControls({ logOptions, logId }: LogTopbarControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <LogSelect logs={logOptions} currentLogId={logId} />
      <DeleteLogButton logId={logId} />
    </div>
  );
}

