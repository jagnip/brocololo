import { LogSelect, type LogSelectOption } from "@/components/log/log-select";
import { LogPersonSelect } from "@/components/log/log-person-select";
import { DeleteLogButton } from "@/components/log/delete-log-button";
import { PageHeader } from "../page-header";

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
    <header className="flex flex-col gap-item">
      <PageHeader title="Log details" className="mb-0" />
      <div className="flex flex-wrap items-center gap-item">
        <LogSelect logs={logOptions} currentLogId={logId} />
        <LogPersonSelect value={person} />
        <DeleteLogButton logId={logId} />
      </div>
    </header>
  );
}
