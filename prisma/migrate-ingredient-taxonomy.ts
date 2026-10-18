/**
 * Standardizes ingredient aisle names, splits Frozen Foods, and applies the
 * reviewed ingredient cleanup. Safe to point at development or production.
 *
 * Usage:
 *   npx tsx prisma/migrate-ingredient-taxonomy.ts --scan
 *   npx tsx prisma/migrate-ingredient-taxonomy.ts --dry-run
 *   npx tsx prisma/migrate-ingredient-taxonomy.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db/index";
import { rebuildAllShoppingLayoutPresetCategoryOrders } from "../lib/db/shopping-list";
import {
  INGREDIENT_CATEGORY_SEEDS,
  type IngredientCategorySeedName,
} from "./ingredient-categories.seed";
import {
  INGREDIENT_MOVE_RULES,
  OBSOLETE_FROZEN_CATEGORY_SLUGS,
  resolveFrozenFreeTextCategory,
  resolveIngredientCategoryMove,
} from "./ingredient-taxonomy-mappings";

type IngredientMove = {
  id: string;
  name: string;
  slug: string;
  sourceCategorySlug: string;
  targetName: IngredientCategorySeedName;
};

type FreeTextMove = {
  id: string;
  displayLabel: string;
  targetName: IngredientCategorySeedName;
};

function parseArgs() {
  return {
    scan: process.argv.includes("--scan"),
    dryRun: process.argv.includes("--dry-run"),
  };
}

function databaseLabel(): string {
  const value = process.env.DATABASE_URL;
  if (!value) return "(unset)";
  const url = new URL(value);
  return `${url.hostname}/${url.pathname.replace(/^\//, "")}`;
}

async function buildPlan() {
  const categories = await prisma.ingredientCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      sortOrder: true,
      _count: { select: { ingredients: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const categoryBySlug = new Map(categories.map((row) => [row.slug, row]));
  const categoryByName = new Map(categories.map((row) => [row.name, row]));
  const conflicts = INGREDIENT_CATEGORY_SEEDS.flatMap((seed) => {
    const sameName = categoryByName.get(seed.name);
    return sameName && sameName.slug !== seed.slug
      ? [`${seed.name}: expected slug ${seed.slug}, found ${sameName.slug}`]
      : [];
  });

  const sourceCategorySlugs = [
    ...new Set(
      INGREDIENT_MOVE_RULES.flatMap((rule) => [...rule.sourceCategorySlugs]),
    ),
  ];
  const candidateIngredients = await prisma.ingredient.findMany({
    where: { category: { slug: { in: sourceCategorySlugs } } },
    select: {
      id: true,
      name: true,
      slug: true,
      category: { select: { slug: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  const ingredientMoves: IngredientMove[] = [];
  const unknownFrozenIngredients: string[] = [];
  for (const ingredient of candidateIngredients) {
    const sourceCategorySlug = ingredient.category.slug;
    const targetName = resolveIngredientCategoryMove({
      sourceCategorySlug,
      ingredientSlug: ingredient.slug,
    });
    if (targetName) {
      ingredientMoves.push({
        id: ingredient.id,
        name: ingredient.name,
        slug: ingredient.slug,
        sourceCategorySlug,
        targetName,
      });
    } else if (
      OBSOLETE_FROZEN_CATEGORY_SLUGS.some(
        (slug) => slug === sourceCategorySlug,
      )
    ) {
      unknownFrozenIngredients.push(
        `${ingredient.slug} (${ingredient.name})`,
      );
    }
  }

  const obsoleteCategories = categories.filter((category) =>
    OBSOLETE_FROZEN_CATEGORY_SLUGS.some((slug) => slug === category.slug),
  );
  const obsoleteIds = obsoleteCategories.map(({ id }) => id);
  const freeTextRows =
    obsoleteIds.length === 0
      ? []
      : await prisma.shoppingListItem.findMany({
          where: {
            groceryIngredientId: null,
            ingredientCategoryId: { in: obsoleteIds },
          },
          select: { id: true, displayLabel: true },
          orderBy: { displayLabel: "asc" },
        });

  const freeTextMoves: FreeTextMove[] = [];
  const unknownFrozenFreeTextRows: string[] = [];
  for (const row of freeTextRows) {
    const targetName = resolveFrozenFreeTextCategory(row.displayLabel);
    if (targetName) {
      freeTextMoves.push({ ...row, targetName });
    } else {
      unknownFrozenFreeTextRows.push(row.displayLabel);
    }
  }

  return {
    categories,
    conflicts,
    ingredientMoves,
    freeTextMoves,
    unknownFrozenIngredients,
    unknownFrozenFreeTextRows,
    obsoleteCategories,
    categoriesToCreate: INGREDIENT_CATEGORY_SEEDS.filter(
      ({ slug }) => !categoryBySlug.has(slug),
    ),
    categoriesToRename: INGREDIENT_CATEGORY_SEEDS.flatMap((seed) => {
      const current = categoryBySlug.get(seed.slug);
      return current && current.name !== seed.name
        ? [{ from: current.name, to: seed.name, slug: seed.slug }]
        : [];
    }),
  };
}

function assertSafePlan(plan: Awaited<ReturnType<typeof buildPlan>>) {
  const problems = [
    ...plan.conflicts.map((value) => `Category conflict: ${value}`),
    ...plan.unknownFrozenIngredients.map(
      (value) => `Unknown frozen ingredient: ${value}`,
    ),
    ...plan.unknownFrozenFreeTextRows.map(
      (value) => `Unknown frozen free-text row: ${value}`,
    ),
  ];
  if (problems.length > 0) {
    throw new Error(`Migration preflight failed:\n${problems.join("\n")}`);
  }
}

function printPlan(plan: Awaited<ReturnType<typeof buildPlan>>) {
  console.log(`DATABASE: ${databaseLabel()}`);
  console.log(
    `Current categories: ${plan.categories.length}; canonical categories: ${INGREDIENT_CATEGORY_SEEDS.length}.`,
  );
  for (const category of plan.categories) {
    console.log(
      `  ${String(category.sortOrder).padStart(2)} | ${category.slug} | ${category.name} | ${category._count.ingredients} ingredient(s)`,
    );
  }
  console.log(`Categories to create: ${plan.categoriesToCreate.length}`);
  for (const category of plan.categoriesToCreate) {
    console.log(`  + ${category.name} (${category.slug})`);
  }
  console.log(`Categories to rename: ${plan.categoriesToRename.length}`);
  for (const category of plan.categoriesToRename) {
    console.log(`  ${category.from} -> ${category.to} (${category.slug})`);
  }
  console.log(`Ingredients to move: ${plan.ingredientMoves.length}`);
  for (const move of plan.ingredientMoves) {
    console.log(
      `  ${move.sourceCategorySlug} -> ${move.targetName}: ${move.slug} (${move.name})`,
    );
  }
  console.log(`Free-text rows to move: ${plan.freeTextMoves.length}`);
  for (const move of plan.freeTextMoves) {
    console.log(`  -> ${move.targetName}: ${move.displayLabel}`);
  }
  console.log(
    `Obsolete frozen categories to delete: ${plan.obsoleteCategories.map(({ slug }) => slug).join(", ") || "none"}`,
  );
}

async function main() {
  const { scan, dryRun } = parseArgs();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const plan = await buildPlan();
  printPlan(plan);
  assertSafePlan(plan);

  if (scan || dryRun) {
    console.log(scan ? "SCAN COMPLETE - no writes." : "DRY RUN COMPLETE - no writes.");
    return;
  }

  const summary = await prisma.$transaction(
    async (tx) => {
      const categoryIdByName = new Map<IngredientCategorySeedName, string>();
      for (const [sortOrder, seed] of INGREDIENT_CATEGORY_SEEDS.entries()) {
        const category = await tx.ingredientCategory.upsert({
          where: { slug: seed.slug },
          create: { ...seed, sortOrder },
          update: { name: seed.name, sortOrder },
        });
        categoryIdByName.set(seed.name, category.id);
      }

      let ingredientMoves = 0;
      for (const move of plan.ingredientMoves) {
        const categoryId = categoryIdByName.get(move.targetName);
        if (!categoryId) throw new Error(`Missing category: ${move.targetName}`);
        await tx.ingredient.update({
          where: { id: move.id },
          data: { categoryId },
        });
        ingredientMoves += 1;
      }

      const linkedShoppingRowsSynced = Number(await tx.$executeRaw`
        UPDATE shopping_list_items AS sli
        SET ingredient_category_id = i.category_id
        FROM grocery_ingredients AS gi
        INNER JOIN ingredients AS i ON i.id = gi.ingredient_id
        WHERE sli.grocery_ingredient_id = gi.id
          AND sli.ingredient_category_id <> i.category_id
      `);

      let freeTextMoves = 0;
      for (const move of plan.freeTextMoves) {
        const categoryId = categoryIdByName.get(move.targetName);
        if (!categoryId) throw new Error(`Missing category: ${move.targetName}`);
        await tx.shoppingListItem.update({
          where: { id: move.id },
          data: { ingredientCategoryId: categoryId },
        });
        freeTextMoves += 1;
      }

      const obsoleteIds = plan.obsoleteCategories.map(({ id }) => id);
      if (obsoleteIds.length > 0) {
        const ingredientsRemaining = await tx.ingredient.count({
          where: { categoryId: { in: obsoleteIds } },
        });
        const shoppingRowsRemaining = await tx.shoppingListItem.count({
          where: { ingredientCategoryId: { in: obsoleteIds } },
        });
        if (ingredientsRemaining > 0 || shoppingRowsRemaining > 0) {
          throw new Error(
            `Cannot delete obsolete frozen categories: ${ingredientsRemaining} ingredient(s), ${shoppingRowsRemaining} shopping row(s) remain.`,
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

      const canonicalRows = await tx.ingredientCategory.findMany({
        where: {
          slug: { in: INGREDIENT_CATEGORY_SEEDS.map(({ slug }) => slug) },
        },
        select: { name: true, slug: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      });
      const canonicalState = canonicalRows.map(({ name, slug, sortOrder }) => ({
        name,
        slug,
        sortOrder,
      }));
      const expectedState = INGREDIENT_CATEGORY_SEEDS.map(
        ({ name, slug }, sortOrder) => ({ name, slug, sortOrder }),
      );
      if (JSON.stringify(canonicalState) !== JSON.stringify(expectedState)) {
        throw new Error("Canonical category verification failed.");
      }

      return {
        categoriesCreated: plan.categoriesToCreate.length,
        categoriesRenamed: plan.categoriesToRename.length,
        ingredientMoves,
        linkedShoppingRowsSynced,
        freeTextMoves,
        obsoleteCategoriesDeleted: obsoleteIds.length,
      };
    },
    { maxWait: 30_000, timeout: 120_000 },
  );

  console.log("Ingredient taxonomy migration finished.");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
