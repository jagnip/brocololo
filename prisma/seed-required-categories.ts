import "dotenv/config";
import slugify from "slugify";
import { prisma } from "../lib/db/index";

// Planner relies on these meal occasion slugs in filtering logic.
const REQUIRED_MEAL_OCCASIONS = ["Breakfast", "Lunch", "Snack", "Dinner"] as const;

// Requested baseline protein categories for planner and recipe tagging.
const REQUIRED_PROTEINS = [
  "Chicken",
  "Turkey",
  "Fish",
  "Beef",
  "Pork",
  "Tofu",
  "Eggs",
  "Dairy",
] as const;

const RECIPE_TYPES = [
  "Savoury pies",
  "Savoury bakes",
  "Soups",
  "Stews",
  "Wraps",
  "Sandwiches",
  "Pan-fry",
  "Stir-fry",
  "Meatballs",
  "Patties",
  "One-pot",
  "Pancakes",
  "Pizzas",
  "Grilled",
  "Noodles",
  "Oats",
  "Cheesecakes",
  "Bars",
  "Sweet bakes",
  "Sweet pies",
  "Cakes",
  "Puddings",
  "Ice cream",
  "Sweets",
  "Special occasions",
] as const;

function toSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true });
}

/**
 * Ensures a category exists and is compatible with the expected type.
 * Safe to run repeatedly without creating duplicates.
 */
async function ensureCategory(params: {
  name: string;
  type: "MEAL_OCCASION" | "RECIPE_TYPE" | "PROTEIN";
}) {
  const normalizedName = params.name.trim().replace(/\s+/g, " ");
  const slug = toSlug(normalizedName);

  const existing = await prisma.category.findUnique({
    where: { slug },
  });

  if (!existing) {
    return prisma.category.create({
      data: {
        name: normalizedName,
        slug,
        type: params.type,
      },
    });
  }

  // Guard against silently changing category semantics on existing data.
  if (existing.type !== params.type) {
    throw new Error(
      `Category "${slug}" exists as "${existing.type}" but expected "${params.type}".`
    );
  }

  // Keep seeded categories normalized if names were manually edited.
  return prisma.category.update({
    where: { id: existing.id },
    data: {
      name: normalizedName,
    },
  });
}

async function main() {
  console.log("🌱 Ensuring required planner categories...");

  await prisma.$transaction(
    async () => {
      // Seed fixed meal occasions used by planner and recipe filtering.
      for (const mealOccasionName of REQUIRED_MEAL_OCCASIONS) {
        await ensureCategory({
          name: mealOccasionName,
          type: "MEAL_OCCASION",
        });
      }

      // Seed required proteins.
      for (const proteinName of REQUIRED_PROTEINS) {
        await ensureCategory({
          name: proteinName,
          type: "PROTEIN",
        });
      }

      // Seed fixed recipe types as a flat taxonomy.
      for (const recipeTypeName of RECIPE_TYPES) {
        await ensureCategory({
          name: recipeTypeName,
          type: "RECIPE_TYPE",
        });
      }
    },
    {
      // Keep script robust on slower database connections.
      maxWait: 20_000,
      timeout: 60_000,
    }
  );

  console.log("✅ Required categories are seeded.");
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed required categories:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
