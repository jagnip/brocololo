/**
 * One-time migration: move legacy canonical grocery data on global ingredients
 * into a per-user overlay, then clear canonical fields.
 *
 * Usage:
 *   MIGRATION_OWNER_CLERK_ID=user_xxx npx tsx prisma/migrate-global-grocery-to-overlay.ts
 *   MIGRATION_OWNER_CLERK_ID=user_xxx npx tsx prisma/migrate-global-grocery-to-overlay.ts --execute
 */
import "dotenv/config";
import { prisma } from "../lib/db/index";

function requireOwnerClerkId(): string {
  const clerkId = process.env.MIGRATION_OWNER_CLERK_ID?.trim();
  if (!clerkId) {
    console.error(
      "Set MIGRATION_OWNER_CLERK_ID to the Clerk user ID that should receive the overlay data.",
    );
    process.exit(1);
  }
  return clerkId;
}

type CandidateRow = {
  id: string;
  name: string;
  supermarketUrl: string | null;
  groceryIngredient: {
    additionalInfo: string | null;
    substitutionNote: string | null;
  } | null;
};

function hasCanonicalGroceryData(row: CandidateRow): boolean {
  const grocery = row.groceryIngredient;
  return (
    (row.supermarketUrl != null && row.supermarketUrl.trim() !== "") ||
    (grocery?.additionalInfo != null && grocery.additionalInfo.trim() !== "") ||
    (grocery?.substitutionNote != null && grocery.substitutionNote.trim() !== "")
  );
}

async function main() {
  const execute = process.argv.includes("--execute");
  const ownerClerkId = requireOwnerClerkId();

  const owner = await prisma.user.findUnique({
    where: { clerkId: ownerClerkId },
    select: { id: true, clerkId: true, email: true },
  });

  if (!owner) {
    console.error(
      `No app user found for Clerk ID ${ownerClerkId}. Sign in once so the user row exists.`,
    );
    process.exit(1);
  }

  const candidates = await prisma.ingredient.findMany({
    where: { userId: null },
    select: {
      id: true,
      name: true,
      supermarketUrl: true,
      groceryIngredient: {
        select: {
          additionalInfo: true,
          substitutionNote: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rowsToMigrate = candidates.filter(hasCanonicalGroceryData);

  console.log(
    `${execute ? "EXECUTE" : "DRY RUN"}: migrate global grocery data to overlay`,
  );
  console.log(`Owner: ${owner.email ?? owner.clerkId} (${owner.id})`);
  console.log(`Global ingredients scanned: ${candidates.length}`);
  console.log(`Ingredients with canonical grocery data: ${rowsToMigrate.length}`);

  if (rowsToMigrate.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rowsToMigrate) {
    const canonicalUrl = row.supermarketUrl?.trim() || null;
    const canonicalNotes = row.groceryIngredient?.additionalInfo?.trim() || null;
    const canonicalSubs = row.groceryIngredient?.substitutionNote?.trim() || null;

    const existing = await prisma.ingredientUserCustomization.findUnique({
      where: {
        userId_ingredientId: {
          userId: owner.id,
          ingredientId: row.id,
        },
      },
      select: {
        supermarketUrl: true,
        additionalInfo: true,
        substitutionNote: true,
      },
    });

    const nextOverlay = {
      supermarketUrl: existing?.supermarketUrl ?? canonicalUrl,
      additionalInfo: existing?.additionalInfo ?? canonicalNotes,
      substitutionNote: existing?.substitutionNote ?? canonicalSubs,
    };

    const hasOverlayValues =
      nextOverlay.supermarketUrl != null ||
      nextOverlay.additionalInfo != null ||
      nextOverlay.substitutionNote != null;

    if (!hasOverlayValues) {
      skipped += 1;
      continue;
    }

    console.log(`- ${row.name}`);
    console.log(
      `    overlay: url=${nextOverlay.supermarketUrl ?? "(empty)"} notes=${nextOverlay.additionalInfo ?? "(empty)"} subs=${nextOverlay.substitutionNote ?? "(empty)"}`,
    );

    if (execute) {
      if (existing) {
        await prisma.ingredientUserCustomization.update({
          where: {
            userId_ingredientId: {
              userId: owner.id,
              ingredientId: row.id,
            },
          },
          data: nextOverlay,
        });
        updated += 1;
      } else {
        await prisma.ingredientUserCustomization.create({
          data: {
            userId: owner.id,
            ingredientId: row.id,
            ...nextOverlay,
          },
        });
        created += 1;
      }

      await prisma.ingredient.update({
        where: { id: row.id },
        data: { supermarketUrl: null },
      });

      if (row.groceryIngredient) {
        await prisma.groceryIngredient.updateMany({
          where: { ingredientId: row.id },
          data: {
            additionalInfo: null,
            substitutionNote: null,
            substitutionsAllowed: false,
          },
        });
      }
    }
  }

  console.log("");
  if (!execute) {
    console.log("Dry run complete. Re-run with --execute to apply changes.");
    return;
  }

  console.log(`Overlay rows created: ${created}`);
  console.log(`Overlay rows updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log("Canonical global grocery fields cleared.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
