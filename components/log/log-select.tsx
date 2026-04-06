"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/lib/constants";

export type LogSelectOption = {
  id: string;
  label: string;
};

type LogSelectProps = {
  logs: LogSelectOption[];
  currentLogId: string;
};

export function LogSelect({ logs, currentLogId }: LogSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleValueChange = (nextLogId: string) => {
    if (nextLogId === currentLogId) return;
    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    const nextPath = ROUTES.logView(nextLogId);
    router.push(query ? `${nextPath}?${query}` : nextPath);
  };

  return (
    <Select
      value={currentLogId}
      onValueChange={handleValueChange}
      allowInlineClear={false}
    >
      {/* Let the trigger shrink on small screens and truncate label text instead of growing layout gaps. */}
      <SelectTrigger className="w-40 min-w-0 sm:w-48 md:max-w-md">
        <SelectValue className="truncate" placeholder="Select a log" />
      </SelectTrigger>
      <SelectContent>
        {logs.map((log) => (
          <SelectItem key={log.id} value={log.id}>
            {log.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
