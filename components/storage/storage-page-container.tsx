import { ensureSelfFamilyMember } from "@/lib/db/family-members";
import { listStoredMealLots } from "@/lib/db/storage";
import { requireUser } from "@/lib/auth/session";
import { StorageList } from "./storage-list";
import { listRollingMealQueue } from "@/lib/db/rolling-meals";
import { RollingMealsSection } from "./rolling-meals-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export async function StoragePageContainer() {
  const { id: userId } = await requireUser();
  const [lots, familyMembers, rollingMeals] = await Promise.all([
    listStoredMealLots(userId),
    ensureSelfFamilyMember(userId),
    listRollingMealQueue(userId).catch((error: unknown) => {
      if (error instanceof Error && (error.message === "ROLLING_MIGRATION_REQUIRED" || ("code" in error && error.code === "ROLLING_MIGRATION_REQUIRED"))) return null;
      throw error;
    }),
  ]);
  return (
    <div className="space-y-block">
      <StorageList lots={lots} familyMembers={familyMembers} />
      {rollingMeals === null ? (
        <Alert>
          <AlertTitle>Rolling meals need migration</AlertTitle>
          <AlertDescription>Your planned meals are unavailable until they have been reviewed and migrated. Contact support, then reload this page.</AlertDescription>
        </Alert>
      ) : <RollingMealsSection meals={rollingMeals} />}
    </div>
  );
}
