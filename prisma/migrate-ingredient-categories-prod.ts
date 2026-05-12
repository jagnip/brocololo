/**
 * One-off production migration: new supermarket aisle taxonomy.
 *
 * 1. Upserts all rows from `INGREDIENT_CATEGORY_ORDER` (by slug).
 * 2. Sets each seed ingredient’s `category_id` from `ingredient-seed-objects.ts` (match by ingredient slug).
 * 3. Moves any remaining ingredients off legacy `IngredientCategory` slugs onto the new taxonomy.
 * 4. Syncs `shopping_list_items.ingredient_category_id` from linked ingredients (via `grocery_ingredients`).
 * 5. Puts free-text list rows still on obsolete categories onto **Others**.
 * 6. Removes preset ↔ obsolete category links, deletes obsolete `ingredient_categories` rows.
 * 7. Rebuilds all shopping layout preset aisle orders (see `rebuildAllShoppingLayoutPresetCategoryOrders`).
 *
 * Usage (requires `DATABASE_URL`):
 *   npx tsx prisma/migrate-ingredient-categories-prod.ts --dry-run
 *   npx tsx prisma/migrate-ingredient-categories-prod.ts
 *
 * Always run `--dry-run` on a backup or staging mirror first.
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

function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

/** Old `IngredientCategory.slug` values → new aisle (for rows not covered by seed slug updates). */
const LEGACY_SLUG_TO_TARGET: Record<string, IngredientCategorySeedName> = {
  produce: "Veg",
  "dairy-and-eggs": "Dairy, Eggs & Cheese",
  // Older `seed.ts` used shorter slugs for some rows — handle both.
  "dairy-eggs": "Dairy, Eggs & Cheese",
  "grains-and-pasta": "Pasta, Rice & Beans",
  "grains-pasta": "Pasta, Rice & Beans",
  "bread-and-bakery": "Bakery",
  "bread-wraps": "Bakery",
  legumes: "Tinned Foods & Soups",
  "nuts-and-seeds": "Snacks & Sweets",
  "nuts-seeds": "Snacks & Sweets",
  "oils-and-condiments": "Sauce & Condiments",
  "oils-condiments": "Sauce & Condiments",
  "spices-and-herbs": "Spices, Herbs & Seasonings",
  "spices-herbs": "Spices, Herbs & Seasonings",
  "canned-and-jarred": "Tinned Foods & Soups",
  "canned-jarred": "Tinned Foods & Soups",
  baking: "Baking Items",
  frozen: "Frozen Foods",
  sweeteners: "Baking Items",
  other: "Others",
};

/** Only these slugs are removed if still present after moves (avoids deleting user-created aisles). */
function buildRetiredCatalogSlugSet(): Set<string> {
  const names = [
    "Produce",
    "Dairy & Eggs",
    "Meat & Poultry",
    "Fish & Seafood",
    "Grains & Pasta",
    "Bread & Bakery",
    "Bread & Wraps",
    "Legumes",
    "Nuts & Seeds",
    "Oils & Condiments",
    "Spices & Herbs",
    "Canned & Jarred",
    "Baking",
    "Frozen",
    "Sweeteners",
    "Other",
  ];
  return new Set([
    ...Object.keys(LEGACY_SLUG_TO_TARGET),
    ...names.map((n) => toSlug(n)),
    // Short slugs used in older `seed.ts` ingredient blocks.
    "dairy-eggs",
    "grains-pasta",
    "oils-condiments",
    "spices-herbs",
    "canned-jarred",
    "nuts-seeds",
    "bread-wraps",
  ]);
}

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  return { dryRun };
}

async function main() {
  const { dryRun } = parseArgs();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const allowedSlugs = new Set(
    INGREDIENT_CATEGORY_ORDER.map((name) => toSlug(name)),
  );
  const retiredCatalogSlugs = buildRetiredCatalogSlugSet();
  const obsoleteSlugList = [...retiredCatalogSlugs].filter(
    (slug) => !allowedSlugs.has(slug),
  );

  console.log(
    dryRun
      ? "DRY RUN — no writes. Review the plan, then run without --dry-run."
      : "LIVE RUN — applying changes in a single transaction.",
  );

  const beforeCategories = await prisma.ingredientCategory.findMany({
    select: { id: true, slug: true, name: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  const beforeIngredients = await prisma.ingredient.count();

  console.log(
    `Found ${beforeCategories.length} ingredient categories, ${beforeIngredients} ingredients.`,
  );

  if (dryRun) {
    const legacySlugs = new Set(Object.keys(LEGACY_SLUG_TO_TARGET));
    const legacyPresent = beforeCategories.filter((c) => legacySlugs.has(c.slug));
    console.log(
      `Legacy slugs still present (sample): ${legacyPresent
        .slice(0, 20)
        .map((c) => c.slug)
        .join(", ")}${legacyPresent.length > 20 ? "…" : ""}`,
    );
    const seedSlugs = new Set(ingredientSeedObjects.map((o) => toSlug(o.name)));
    const seedMatchCount = await prisma.ingredient.count({
      where: { slug: { in: [...seedSlugs] } },
    });
    console.log(
      `Would reassign ${ingredientSeedObjects.length} seed rows by slug (${seedMatchCount} DB rows match those slugs).`,
    );
    console.log("Would upsert categories:", INGREDIENT_CATEGORY_ORDER.join(", "));
    console.log(
      `Would delete retired categories (slugs): ${obsoleteSlugList.join(", ") || "(none)"}`,
    );
    return;
  }

  const summary = await prisma.$transaction(
    async (tx) => {
      // 1) Canonical categories (slug is stable id for upsert).
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

      let seedUpdates = 0;
      for (const row of ingredientSeedObjects) {
        const slug = toSlug(row.name);
        const categoryId = categoryIdByName.get(row.categoryName);
        if (!categoryId) {
          throw new Error(`Missing category for seed "${row.name}": ${row.categoryName}`);
        }
        const res = await tx.ingredient.updateMany({
          where: { slug },
          data: { categoryId },
        });
        seedUpdates += res.count;
      }

      let legacyMoves = 0;
      for (const [legacySlug, targetName] of Object.entries(LEGACY_SLUG_TO_TARGET)) {
        if (allowedSlugs.has(legacySlug)) continue;
        const oldCat = await tx.ingredientCategory.findUnique({
          where: { slug: legacySlug },
          select: { id: true },
        });
        if (!oldCat) continue;
        const newId = categoryIdByName.get(targetName);
        if (!newId) {
          throw new Error(`Missing target category: ${targetName}`);
        }
        const res = await tx.ingredient.updateMany({
          where: { categoryId: oldCat.id },
          data: { categoryId: newId },
        });
        legacyMoves += res.count;
      }

      // Shopping list rows tied to a grocery ingredient: mirror the ingredient’s aisle.
      const listSync = await tx.$executeRaw`
        UPDATE shopping_list_items AS sli
        SET ingredient_category_id = i.category_id
        FROM grocery_ingredients AS gi
        INNER JOIN ingredients AS i ON i.id = gi.ingredient_id
        WHERE sli.grocery_ingredient_id = gi.id
      `;

      const othersId = categoryIdByName.get("Others");
      if (!othersId) throw new Error("Missing Others category");

      const obsoleteCats =
        obsoleteSlugList.length === 0
          ? []
          : await tx.ingredientCategory.findMany({
              where: { slug: { in: obsoleteSlugList } },
              select: { id: true, slug: true },
            });
      const obsoleteIds = obsoleteCats.map((c) => c.id);

      if (obsoleteIds.length > 0) {
        // Fail fast if any ingredient still points at a category we are about to
        // remove (avoids FK errors and silent inconsistency). Recipes use
        // `ingredient_id` only; this guards `ingredients.category_id` cleanup.
        const ingredientsStillOnObsolete = await tx.ingredient.count({
          where: { categoryId: { in: obsoleteIds } },
        });
        if (ingredientsStillOnObsolete > 0) {
          throw new Error(
            `${ingredientsStillOnObsolete} ingredient(s) still use an obsolete category id; ` +
              `aborting before delete. Extend LEGACY_SLUG_TO_TARGET or fix slugs, then retry.`,
          );
        }

        await tx.shoppingListItem.updateMany({
          where: {
            groceryIngredientId: null,
            ingredientCategoryId: { in: obsoleteIds },
          },
          data: { ingredientCategoryId: othersId },
        });

        await tx.shoppingLayoutPresetCategory.deleteMany({
          where: { ingredientCategoryId: { in: obsoleteIds } },
        });

        await tx.ingredientCategory.deleteMany({
          where: { id: { in: obsoleteIds } },
        });
      }

      await rebuildAllShoppingLayoutPresetCategoryOrders(tx);

      return {
        seedUpdates,
        legacyMoves,
        listSyncRows: Number(listSync),
        deletedObsoleteCategories: obsoleteIds.length,
      };
    },
    { maxWait: 30_000, timeout: 120_000 },
  );

  console.log("✅ Migration finished.");
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
