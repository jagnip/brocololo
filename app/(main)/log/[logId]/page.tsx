import { notFound, redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { getLogById } from "@/lib/db/logs";
import { requireUser } from "@/lib/auth/session";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";

export default async function LogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ logId: string }>;
  searchParams: Promise<{ memberId?: string; day?: string }>;
}) {
  const { logId } = await params;
  const { memberId } = await searchParams;
  const { id: userId } = await requireUser();
  const familyMembers = await ensureSelfFamilyMember(userId);
  const selectedMember =
    familyMembers.find((member) => member.id === memberId) ??
    familyMembers.find((member) => member.isSelf) ??
    familyMembers[0];
  if (!selectedMember) {
    notFound();
  }
  const log = await getLogById(userId, logId, selectedMember.id);
  if (!log) {
    notFound();
  }

  const paramsForRedirect = new URLSearchParams();
  paramsForRedirect.set("tab", "log");
  if (memberId) {
    paramsForRedirect.set("memberId", memberId);
  }
  redirect(`${ROUTES.planView(log.plan.id)}?${paramsForRedirect.toString()}`);
}
