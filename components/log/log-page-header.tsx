import { LogSelect, type LogSelectOption } from "@/components/log/log-select";
import { LogPersonSelect } from "@/components/log/log-person-select";
import { DeleteLogButton } from "@/components/log/delete-log-button";

type LogPageHeaderProps = {
  logOptions: LogSelectOption[];
  logId: string;
  person: "PRIMARY" | "SECONDARY";
};

export function LogPageHeader({
  logOptions,
  logId,
  person,
}: LogPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <LogSelect logs={logOptions} currentLogId={logId} />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <LogPersonSelect value={person} />
        <DeleteLogButton logId={logId} />
      </div>
    </header>
  );
}
