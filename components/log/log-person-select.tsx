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

/**
 * Reads `?person=` from the URL so the control works in the app top bar (layouts do not receive searchParams).
 * Falls back to PRIMARY when the param is absent — same as `LogPage`’s `parsePerson`.
 */
export function LogPersonSelectFromUrl() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("person");
  const value =
    raw === LogPerson.SECONDARY ? LogPerson.SECONDARY : LogPerson.PRIMARY;
  return <LogPersonSelect value={value} />;
}

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
    // Person is always PRIMARY or SECONDARY — never empty; hide Select’s inline clear (X).
    <Select value={value} onValueChange={handleValueChange} allowInlineClear={false}>
      {/* Narrow trigger on small screens; top bar also has log switcher + actions. */}
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
