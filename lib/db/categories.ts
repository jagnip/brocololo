import { prisma } from "./index";
import { Prisma, type Category } from "@/src/generated/client";
import slugify from "slugify";
import type { CreateRecipeCategoryInput } from "@/lib/validations/category";

export async function getCategories(): Promise<Category[]> {
  return await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getCategoriesByType(
  type: "FLAVOUR" | "RECIPE_TYPE" | "PROTEIN"
): Promise<Category[]> {
  return await prisma.category.findMany({
    where: {
      type,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createRecipeCategory(
  input: CreateRecipeCategoryInput,
): Promise<Category> {
  const savoury = await prisma.category.findFirst({
    where: { type: "FLAVOUR", slug: "savoury" },
    select: { id: true },
  });
  const sweet = await prisma.category.findFirst({
    where: { type: "FLAVOUR", slug: "sweet" },
    select: { id: true },
  });

  // These system categories are required for category parent mapping.
  if (!savoury || !sweet) {
    throw new Error("Required flavour categories (savoury/sweet) are missing.");
  }

  if (input.flavourSlug === "sweet" && input.kind === "PROTEIN") {
    throw new Error("Protein category cannot be created under sweet flavour.");
  }

  // Per agreed rule, protein categories always belong to savoury parent.
  const parentId =
    input.kind === "PROTEIN"
      ? savoury.id
      : input.flavourSlug === "sweet"
        ? sweet.id
        : savoury.id;

  const slug = slugify(input.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  try {
    return await prisma.category.create({
      data: {
        name: input.name,
        slug,
        type: input.kind,
        parentId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("A category with this name already exists.");
    }
    throw error;
  }
}