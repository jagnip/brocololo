"use server";

import { createRecipe } from "@/lib/db/recipes";
import { InsertRecipeOutputType } from "@/lib/validations/recipe";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { Prisma } from "@/src/generated/client";

export const createRecipeAction = async (

  formData: InsertRecipeOutputType
) => {

    let recipe;

    const slug = slugify(formData.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  try {
    recipe = await createRecipe({ ...formData, slug });
  } catch (error) {
    console.error("Error", error);

     // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          type: "error",
          message: "A recipe with this name already exists",
        };
      }
    }

    return {
      type: "error",
      message: "Failed to create recipe",
    };
  }

  redirect(`/recipes/${recipe.slug}`);
};