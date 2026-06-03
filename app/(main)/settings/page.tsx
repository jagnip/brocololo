import { SettingsForm } from "@/components/settings/settings-form";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";
import { requireUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const { id: userId } = await requireUser();
  const members = await ensureSelfFamilyMember(userId);

  return (
    <div className="page-container">
      <SettingsForm initialMembers={members} />
    </div>
  );
}
