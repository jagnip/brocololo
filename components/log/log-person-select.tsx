"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTopbar } from "@/components/context/topbar-context";
import type { FamilyMemberRow } from "@/lib/db/family-members";

type LogPersonSelectProps = {
  value: string;
  familyMembers: FamilyMemberRow[];
};

/**
 * Reads `?memberId=` from the URL so the control works in the app top bar.
 * Falls back to the self member when the param is absent.
 */
export function LogPersonSelectFromUrl({
  familyMembers,
}: {
  familyMembers: FamilyMemberRow[];
}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("memberId");
  const fallback =
    familyMembers.find((member) => member.isSelf)?.id ?? familyMembers[0]?.id ?? "";
  const value = familyMembers.some((member) => member.id === raw)
    ? raw!
    : fallback;
  return <LogPersonSelect value={value} familyMembers={familyMembers} />;
}

export function LogPersonSelect({ value, familyMembers }: LogPersonSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [optimisticMemberId, setOptimisticMemberId] = useOptimistic(value);
  const { setLogFilterPending } = useTopbar();

  useEffect(() => {
    // Share person-selector transition state with log page body pulse feedback.
    setLogFilterPending("log-person-select", isPending);
    return () => setLogFilterPending("log-person-select", false);
  }, [isPending, setLogFilterPending]);

  const handleValueChange = (nextValue: string) => {
    if (nextValue === optimisticMemberId) return;
    setOptimisticMemberId(nextValue);
    const params = new URLSearchParams(searchParams.toString());
    params.set("memberId", nextValue);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <Select
      value={optimisticMemberId}
      onValueChange={handleValueChange}
      allowInlineClear={false}
    >
      {/* Narrow trigger on small screens; top bar also has log switcher + actions. */}
      <SelectTrigger className="w-32 shrink-0 sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {familyMembers.map((member, index) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name.trim() ||
              (member.isSelf ? "You" : `Family member ${index}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
