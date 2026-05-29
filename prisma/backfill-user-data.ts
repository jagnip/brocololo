/**
 * One-time backfill: assigns all existing rows to the migration owner user
 * and seeds Jagoda/Nelson family members.
 *
 * IMPORTANT: Use the Clerk user ID from the account you actually sign in with
 * (Clerk Dashboard → Users → your user → User ID), not a stale/dev ID.
 *
 * Usage: MIGRATION_OWNER_CLERK_ID=user_xxx npx tsx prisma/backfill-user-data.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db/index";

const OWNER_CLERK_ID = process.env.MIGRATION_OWNER_CLERK_ID;
if (!OWNER_CLERK_ID) {
  console.error(
    "Set MIGRATION_OWNER_CLERK_ID to your Clerk user ID (the account you sign in with).",
  );
  process.exit(1);
}

async function main() {
  console.log(`Backfilling data for Clerk user: ${OWNER_CLERK_ID}`);

  const owner = await prisma.user.upsert({
    where: { clerkId: OWNER_CLERK_ID },
    create: { clerkId: OWNER_CLERK_ID },
    update: {},
    select: { id: true },
  });

  const [recipes, plans, lists] = await Promise.all([
    prisma.recipe.updateMany({
      where: { userId: { not: owner.id } },
      data: { userId: owner.id },
    }),
    prisma.plan.updateMany({
      where: { userId: { not: owner.id } },
      data: { userId: owner.id },
    }),
    prisma.ingredientList.updateMany({
      where: { userId: { not: owner.id } },
      data: { userId: owner.id },
    }),
  ]);

  // Also catch rows that still have no owner (first run after nullable migration).
  const [orphanRecipes, orphanPlans, orphanLists] = await Promise.all([
    prisma.$executeRawUnsafe(
      `UPDATE recipes SET user_id = $1 WHERE user_id IS NULL`,
      owner.id,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE plans SET user_id = $1 WHERE user_id IS NULL`,
      owner.id,
    ),
    prisma.$executeRawUnsafe(
      `UPDATE ingredient_lists SET user_id = $1 WHERE user_id IS NULL`,
      owner.id,
    ),
  ]);

  await prisma.familyMember.upsert({
    where: { userId_position: { userId: owner.id, position: 0 } },
    create: { userId: owner.id, name: "Jagoda", position: 0 },
    update: { name: "Jagoda" },
  });
  await prisma.familyMember.upsert({
    where: { userId_position: { userId: owner.id, position: 1 } },
    create: { userId: owner.id, name: "Nelson", position: 1 },
    update: { name: "Nelson" },
  });

  console.log("Done:", {
    ownerId: owner.id,
    recipesUpdated: recipes.count + Number(orphanRecipes),
    plansUpdated: plans.count + Number(orphanPlans),
    listsUpdated: lists.count + Number(orphanLists),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
