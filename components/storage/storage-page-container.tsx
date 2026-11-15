import { ensureSelfFamilyMember } from "@/lib/db/family-members";
import { listStoredMealLots } from "@/lib/db/storage";
import { requireUser } from "@/lib/auth/session";
import { StorageList } from "./storage-list";
import { ensureRollingQueueInitialized, listRollingMealQueue } from "@/lib/db/rolling-meals";
import { RollingMealsSection } from "./rolling-meals-section";

export async function StoragePageContainer() {
  const { id: userId } = await requireUser();
  await ensureRollingQueueInitialized(userId);
  const [lots, familyMembers, rollingMeals] = await Promise.all([
    listStoredMealLots(userId),
    ensureSelfFamilyMember(userId),
    listRollingMealQueue(userId),
  ]);
  return (
    <div className="space-y-block">
      <StorageList lots={lots} familyMembers={familyMembers} />
      <RollingMealsSection meals={rollingMeals} />
    </div>
  );
}
