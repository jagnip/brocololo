import "dotenv/config";
import slugify from "slugify";
import { prisma } from "../lib/db/index";
import { ingredientSeedObjects } from "./ingredient-seed-objects";

const INGREDIENT_CATEGORY_ORDER = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Poultry",
  "Fish & Seafood",
  "Grains & Pasta",
  "Bread & Bakery",
  "Legumes",
  "Nuts & Seeds",
  "Oils & Condiments",
  "Spices & Herbs",
  "Canned & Jarred",
  "Baking",
  "Frozen",
  "Sweeteners",
  "Other",
] as const;

function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

async function main() {
  // This seed is intended for a fresh database with no existing data.
  console.log("🌱 Ingredient seed started for a fresh database...");
  console.log(
    `🌱 Seeding ingredients only (${ingredientSeedObjects.length} ingredients)...`
  );

  await prisma.$transaction(async (tx) => {
    // Create ingredient categories in a stable display order.
    const categoryByName = new Map<string, string>();
    for (const [index, categoryName] of INGREDIENT_CATEGORY_ORDER.entries()) {
      const category = await tx.ingredientCategory.create({
        data: {
          name: categoryName,
          slug: toSlug(categoryName),
          sortOrder: index,
        },
      });
      categoryByName.set(categoryName, category.id);
    }

    // Create only units needed by ingredient seed data.
    const unitNames = Array.from(
      new Set(
        ingredientSeedObjects.flatMap((ingredient) =>
          ingredient.units.map((unit) => unit.unitName)
        )
      )
    );

    const unitByName = new Map<string, string>();
    for (const unitName of unitNames) {
      const unit = await tx.unit.create({
        data: { name: unitName },
      });
      unitByName.set(unitName, unit.id);
    }

    // Create ingredients and their grams-per-unit conversions.
    for (const ingredient of ingredientSeedObjects) {
      const categoryId = categoryByName.get(ingredient.categoryName);
      if (!categoryId) {
        throw new Error(
          `Missing category id for "${ingredient.name}" (${ingredient.categoryName}).`
        );
      }

      const createdIngredient = await tx.ingredient.create({
        data: {
          name: ingredient.name,
          slug: toSlug(ingredient.name),
          icon: ingredient.icon,
          supermarketUrl: ingredient.supermarketUrl,
          calories: ingredient.nutritionPer100g.calories,
          proteins: ingredient.nutritionPer100g.proteins,
          fats: ingredient.nutritionPer100g.fats,
          carbs: ingredient.nutritionPer100g.carbs,
          categoryId,
        },
      });

      for (const unit of ingredient.units) {
        const unitId = unitByName.get(unit.unitName);
        if (!unitId) {
          throw new Error(
            `Missing unit id for "${unit.unitName}" in ingredient "${ingredient.name}".`
          );
        }

        await tx.ingredientUnit.create({
          data: {
            ingredientId: createdIngredient.id,
            unitId,
            gramsPerUnit: unit.gramsPerUnit,
          },
        });
      }
    }
  }, {
    // This seed does many sequential writes; default 5s is too short.
    maxWait: 20_000,
    timeout: 180_000,
  });

  console.log("✅ Ingredient seed complete.");
  console.log("✅ Fresh database now contains ingredients-related data.");
}

main()
  .catch((error) => {
    console.error("❌ Ingredient seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
