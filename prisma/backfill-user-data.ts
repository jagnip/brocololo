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

function requireOwnerClerkId(): string {
  const clerkId = process.env.MIGRATION_OWNER_CLERK_ID;
  if (!clerkId) {
    console.error(
      "Set MIGRATION_OWNER_CLERK_ID to your Clerk user ID (the account you sign in with).",
    );
    process.exit(1);
  }
  return clerkId;
}

async function main() {
  const ownerClerkId = requireOwnerClerkId();
  console.log(`Backfilling data for Clerk user: ${ownerClerkId}`);

  const owner = await prisma.user.upsert({
    where: { clerkId: ownerClerkId },
    create: { clerkId: ownerClerkId },
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

  const selfMember = await prisma.familyMember.findFirst({
    where: { userId: owner.id, isSelf: true },
    select: { id: true },
  });
  if (selfMember) {
    await prisma.familyMember.update({
      where: { id: selfMember.id },
      data: { name: "Jagoda" },
    });
  } else {
    await prisma.familyMember.create({
      data: {
        userId: owner.id,
        name: "Jagoda",
        isSelf: true,
        sortOrder: 0,
      },
    });
  }

  const secondaryMember = await prisma.familyMember.findFirst({
    where: { userId: owner.id, isSelf: false, sortOrder: 1 },
    select: { id: true },
  });
  if (secondaryMember) {
    await prisma.familyMember.update({
      where: { id: secondaryMember.id },
      data: { name: "Nelson" },
    });
  } else {
    await prisma.familyMember.create({
      data: {
        userId: owner.id,
        name: "Nelson",
        isSelf: false,
        sortOrder: 1,
      },
    });
  }

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
