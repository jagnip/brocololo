"use server";

import { createRecipe, updateRecipe } from "@/lib/db/recipes";
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


export const updateRecipeAction = async (
  recipeId: string,
  formData: InsertRecipeOutputType
) => {
  let recipe;

  const slug = slugify(formData.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  try {
    recipe = await updateRecipe(recipeId, { ...formData, slug });
  } catch (error) {
    console.error("Error updating recipe", error);

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
      message: "Failed to update recipe",
    };
  }

  redirect(`/recipes/${recipe.slug}`);
};