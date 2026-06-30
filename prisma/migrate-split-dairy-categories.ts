/**
 * Splits the retired "Dairy, Eggs & Cheese" aisle into:
 *   Milk & Eggs | Yogurt & Chilled Desserts | Cheese, Butter & Cream
 *
 * 1. Upserts the full `INGREDIENT_CATEGORY_ORDER` (with the three new aisles).
 * 2. Moves every ingredient still on the old dairy aisle(s) using slug map + heuristics.
 * 3. Reassigns seed ingredients from `ingredient-seed-objects.ts` (by slug).
 * 4. Syncs `shopping_list_items.ingredient_category_id` from linked ingredients.
 * 5. Moves free-text list rows still on obsolete dairy aisles via name heuristics.
 * 6. Deletes obsolete dairy category rows and rebuilds shopping layout presets.
 *
 * Usage (set `DATABASE_URL` to dev or prod):
 *   npx tsx prisma/migrate-split-dairy-categories.ts --scan
 *   npx tsx prisma/migrate-split-dairy-categories.ts --dry-run
 *   npx tsx prisma/migrate-split-dairy-categories.ts
 */
import "dotenv/config";
import slugify from "slugify";
import { prisma } from "../lib/db/index";
import { rebuildAllShoppingLayoutPresetCategoryOrders } from "../lib/db/shopping-list";
import {
  INGREDIENT_CATEGORY_ORDER,
  type IngredientCategorySeedName,
} from "./ingredient-categories.seed";
import { ingredientSeedObjects } from "./ingredient-seed-objects";
import {
  NEW_DAIRY_CATEGORIES,
  OLD_DAIRY_CATEGORY_SLUGS,
  type NewDairyCategoryName,
  resolveNewDairyCategory,
} from "./split-dairy-category-mappings";

function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

function parseArgs() {
  return {
    scan: process.argv.includes("--scan"),
    dryRun: process.argv.includes("--dry-run"),
  };
}

type IngredientRow = { id: string; slug: string; name: string };

async function listOldDairyIngredients(): Promise<IngredientRow[]> {
  return prisma.ingredient.findMany({
    where: {
      category: { slug: { in: [...OLD_DAIRY_CATEGORY_SLUGS] } },
    },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function printScanReport() {
  const dbHost = process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@") ?? "(unset)";
  console.log(`DATABASE: ${dbHost}\n`);

  const ingredients = await listOldDairyIngredients();
  console.log(
    `Found ${ingredients.length} ingredient(s) on retired dairy aisle(s):\n`,
  );

  const byTarget = new Map<NewDairyCategoryName, IngredientRow[]>();
  for (const name of NEW_DAIRY_CATEGORIES) byTarget.set(name, []);

  for (const ingredient of ingredients) {
    const target = resolveNewDairyCategory(ingredient);
    byTarget.get(target)!.push(ingredient);
    console.log(`  ${target.padEnd(28)} | ${ingredient.slug} | ${ingredient.name}`);
  }

  console.log("\nSummary:");
  for (const [target, rows] of byTarget) {
    console.log(`  ${target}: ${rows.length}`);
  }
}

async function main() {
  const { scan, dryRun } = parseArgs();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (scan) {
    await printScanReport();
    return;
  }

  const oldIngredients = await listOldDairyIngredients();
  const ingredientMoves = oldIngredients.map((ingredient) => ({
    ...ingredient,
    targetName: resolveNewDairyCategory(ingredient),
  }));

  console.log(
    dryRun
      ? "DRY RUN — no writes. Review the plan, then run without --dry-run."
      : "LIVE RUN — applying dairy aisle split in a single transaction.",
  );
  console.log(`Ingredients to move: ${ingredientMoves.length}`);
  for (const move of ingredientMoves) {
    console.log(`  → ${move.targetName}: ${move.slug} (${move.name})`);
  }

  if (dryRun) {
    console.log("\nWould upsert categories:", INGREDIENT_CATEGORY_ORDER.join(", "));
    console.log("Would delete obsolete slugs:", OLD_DAIRY_CATEGORY_SLUGS.join(", "));
    return;
  }

  const summary = await prisma.$transaction(
    async (tx) => {
      // 1) Full canonical category list (includes the three new dairy aisles).
      const categoryIdByName = new Map<IngredientCategorySeedName, string>();
      for (const [index, name] of INGREDIENT_CATEGORY_ORDER.entries()) {
        const slug = toSlug(name);
        const row = await tx.ingredientCategory.upsert({
          where: { slug },
          create: { name, slug, sortOrder: index },
          update: { name, sortOrder: index },
        });
        categoryIdByName.set(name, row.id);
      }

      // 2) Move ingredients off retired dairy aisles.
      let dairyMoves = 0;
      for (const move of ingredientMoves) {
        const categoryId = categoryIdByName.get(move.targetName);
        if (!categoryId) {
          throw new Error(`Missing category: ${move.targetName}`);
        }
        await tx.ingredient.update({
          where: { id: move.id },
          data: { categoryId },
        });
        dairyMoves += 1;
      }

      // 3) Seed catalog alignment (slug match).
      let seedUpdates = 0;
      for (const row of ingredientSeedObjects) {
        const slug = toSlug(row.name);
        const categoryId = categoryIdByName.get(row.categoryName);
        if (!categoryId) {
          throw new Error(
            `Missing category for seed "${row.name}": ${row.categoryName}`,
          );
        }
        const res = await tx.ingredient.updateMany({
          where: { slug },
          data: { categoryId },
        });
        seedUpdates += res.count;
      }

      // 4) Shopping list rows tied to a grocery ingredient mirror ingredient aisle.
      const listSync = await tx.$executeRaw`
        UPDATE shopping_list_items AS sli
        SET ingredient_category_id = i.category_id
        FROM grocery_ingredients AS gi
        INNER JOIN ingredients AS i ON i.id = gi.ingredient_id
        WHERE sli.grocery_ingredient_id = gi.id
      `;

      // 5) Free-text rows still on obsolete dairy categories.
      const obsoleteCats = await tx.ingredientCategory.findMany({
        where: { slug: { in: [...OLD_DAIRY_CATEGORY_SLUGS] } },
        select: { id: true, slug: true },
      });
      const obsoleteIds = obsoleteCats.map((c) => c.id);

      let freeTextMoves = 0;
      if (obsoleteIds.length > 0) {
        const freeTextRows = await tx.shoppingListItem.findMany({
          where: {
            groceryIngredientId: null,
            ingredientCategoryId: { in: obsoleteIds },
          },
          select: { id: true, displayLabel: true, ingredientCategoryId: true },
        });

        for (const row of freeTextRows) {
          const targetName = resolveNewDairyCategory({
            slug: toSlug(row.displayLabel),
            name: row.displayLabel,
          });
          const categoryId = categoryIdByName.get(targetName);
          if (!categoryId) throw new Error(`Missing category: ${targetName}`);
          await tx.shoppingListItem.update({
            where: { id: row.id },
            data: { ingredientCategoryId: categoryId },
          });
          freeTextMoves += 1;
        }

        const ingredientsStillOnObsolete = await tx.ingredient.count({
          where: { categoryId: { in: obsoleteIds } },
        });
        if (ingredientsStillOnObsolete > 0) {
          throw new Error(
            `${ingredientsStillOnObsolete} ingredient(s) still on obsolete dairy aisle; aborting.`,
          );
        }

        await tx.shoppingLayoutPresetCategory.deleteMany({
          where: { ingredientCategoryId: { in: obsoleteIds } },
        });

        await tx.ingredientCategory.deleteMany({
          where: { id: { in: obsoleteIds } },
        });
      }

      await rebuildAllShoppingLayoutPresetCategoryOrders(tx);

      return {
        dairyMoves,
        seedUpdates,
        listSyncRows: Number(listSync),
        freeTextMoves,
        deletedObsoleteCategories: obsoleteIds.length,
      };
    },
    { maxWait: 30_000, timeout: 120_000 },
  );

  console.log("✅ Dairy aisle split finished.");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
