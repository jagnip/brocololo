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
      <SelectTrigger className="min-w-48 max-w-md">
        <SelectValue placeholder="Select a log" />
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
