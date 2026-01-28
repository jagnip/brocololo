"use server";

import { createRecipe, deleteRecipe, updateRecipe } from "@/lib/db/recipes";
import {
  CreateRecipePayload,
  UpdateRecipePayload,
} from "@/lib/validations/recipe";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { Prisma } from "@/src/generated/client";
import { ROUTES } from "@/lib/constants";
import { appendRedirectToastToPath } from "@/lib/messages";

export const createRecipeAction = async (

  formData: CreateRecipePayload
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

  redirect(appendRedirectToastToPath(`/recipes/${recipe.slug}`, "recipeCreated"));
};


export const updateRecipeAction = async (
  recipeId: string,
  formData: UpdateRecipePayload
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

  redirect(appendRedirectToastToPath(`/recipes/${recipe.slug}`, "recipeUpdated"));
};

export const deleteRecipeAction = async (recipeId: string) => {
  try {
    await deleteRecipe(recipeId);
  } catch (error) {
    console.error("Error deleting recipe", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return {
          type: "error",
          message: "Recipe was not found (it may already be deleted).",
        };
      }
    }

    return {
      type: "error",
      message: "Failed to delete recipe",
    };
  }

  redirect(ROUTES.recipes);
};