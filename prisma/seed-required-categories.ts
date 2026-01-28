import "dotenv/config";
import slugify from "slugify";
import { prisma } from "../lib/db/index";

// Planner relies on these flavour slugs in filtering logic.
const REQUIRED_FLAVOURS = ["Sweet", "Savoury"] as const;

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

// Recipe types grouped by flavour parent.
const SAVOURY_RECIPE_TYPES = [
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
] as const;

const SWEET_RECIPE_TYPES = [
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
  type: "FLAVOUR" | "RECIPE_TYPE" | "PROTEIN";
  parentId?: string | null;
}) {
  const normalizedName = params.name.trim().replace(/\s+/g, " ");
  const slug = toSlug(normalizedName);
  const parentId = params.parentId ?? null;

  const existing = await prisma.category.findUnique({
    where: { slug },
  });

  if (!existing) {
    return prisma.category.create({
      data: {
        name: normalizedName,
        slug,
        type: params.type,
        parentId,
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
      parentId,
    },
  });
}

async function main() {
  console.log("🌱 Ensuring required planner categories...");

  await prisma.$transaction(
    async () => {
      // Seed required flavours first.
      const flavourBySlug = new Map<string, string>();
      for (const flavourName of REQUIRED_FLAVOURS) {
        const flavour = await ensureCategory({
          name: flavourName,
          type: "FLAVOUR",
          parentId: null,
        });
        flavourBySlug.set(flavour.slug, flavour.id);
      }

      const savouryParentId = flavourBySlug.get("savoury");
      const sweetParentId = flavourBySlug.get("sweet");
      if (!savouryParentId || !sweetParentId) {
        throw new Error("Missing seeded flavour parent categories.");
      }

      // Seed required proteins.
      for (const proteinName of REQUIRED_PROTEINS) {
        await ensureCategory({
          name: proteinName,
          type: "PROTEIN",
          parentId: null,
        });
      }

      // Seed savoury recipe types under the "Savoury" parent category.
      for (const recipeTypeName of SAVOURY_RECIPE_TYPES) {
        await ensureCategory({
          name: recipeTypeName,
          type: "RECIPE_TYPE",
          parentId: savouryParentId,
        });
      }

      // Seed sweet recipe types under the "Sweet" parent category.
      for (const recipeTypeName of SWEET_RECIPE_TYPES) {
        await ensureCategory({
          name: recipeTypeName,
          type: "RECIPE_TYPE",
          parentId: sweetParentId,
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
