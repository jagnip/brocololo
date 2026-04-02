"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LogPersonSelectProps = {
  value: "PRIMARY" | "SECONDARY";
};

export function LogPersonSelect({ value }: LogPersonSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleValueChange = (nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("person", nextValue);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      {/* Narrower on small phones so day + person + day actions fit one row with the log header. */}
      <SelectTrigger className="w-32 shrink-0 sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={LogPerson.PRIMARY}>Jagoda</SelectItem>
        <SelectItem value={LogPerson.SECONDARY}>Nelson</SelectItem>
      </SelectContent>
    </Select>
  );
}
