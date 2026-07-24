import { cn } from "@/lib/utils";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";

type MemberInitialAvatarProps = {
  member: FamilyMemberRow;
  /** Index in the household list — used for fallback labels. */
  index: number;
  className?: string;
};

/** Small circular initial chip for family members (no photos yet). */
export function MemberInitialAvatar({
  member,
  index,
  className,
}: MemberInitialAvatarProps) {
  const label = getFamilyMemberLabel(member, index);
  const initial = label.charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted type-caption font-medium text-foreground",
        className,
      )}
      title={label}
      aria-label={label}
    >
      {initial}
    </span>
  );
}
