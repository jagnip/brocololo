"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTopbar } from "@/components/context/topbar-context";
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
  const [isPending, startTransition] = useTransition();
  const [optimisticLogId, setOptimisticLogId] = useOptimistic(currentLogId);
  const { setLogFilterPending } = useTopbar();

  useEffect(() => {
    // Share selector transition state with page content so only log body pulses.
    setLogFilterPending("log-select", isPending);
    return () => setLogFilterPending("log-select", false);
  }, [isPending, setLogFilterPending]);

  const handleValueChange = (nextLogId: string) => {
    if (nextLogId === optimisticLogId) return;
    setOptimisticLogId(nextLogId);
    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    const nextPath = ROUTES.logView(nextLogId);
    startTransition(() => {
      router.push(query ? `${nextPath}?${query}` : nextPath);
    });
  };

  return (
    <Select
      value={optimisticLogId}
      onValueChange={handleValueChange}
      allowInlineClear={false}
    >
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
