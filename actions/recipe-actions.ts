"use server";

import {
  createRecipe,
  deleteRecipe,
  setRecipeArchived,
  updateRecipe,
} from "@/lib/db/recipes";
import {
  CreateRecipePayload,
  UpdateRecipePayload,
} from "@/lib/validations/recipe";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { Prisma } from "@/src/generated/client";
import { ROUTES } from "@/lib/constants";
import { appendRedirectToastToPath } from "@/lib/messages";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export const createRecipeAction = async (

  formData: CreateRecipePayload
) => {
  const { id: userId } = await requireUser();

    let recipe;

    const slug = slugify(formData.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  try {
    recipe = await createRecipe(userId, { ...formData, slug });
  } catch (error) {
    console.error("Error", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          type: "error",
          message: "A recipe with this name already exists. Try another name",
        };
      }
    }

    return {
      type: "error",
      message: "Couldn't create recipe. Try again",
    };
  }

  redirect(appendRedirectToastToPath(`/recipes/${recipe.slug}`, "recipeCreated"));
};


export const updateRecipeAction = async (
  recipeId: string,
  formData: UpdateRecipePayload
) => {
  const { id: userId } = await requireUser();
  let recipe;

  const slug = slugify(formData.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  try {
    recipe = await updateRecipe(userId, recipeId, { ...formData, slug });
  } catch (error) {
    console.error("Error updating recipe", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          type: "error",
          message: "A recipe with this name already exists. Try another name",
        };
      }
    }

    return {
      type: "error",
      message: "Couldn't update recipe. Try again",
    };
  }

  redirect(appendRedirectToastToPath(`/recipes/${recipe.slug}`, "recipeUpdated"));
};

export const deleteRecipeAction = async (recipeId: string) => {
  const { id: userId } = await requireUser();
  try {
    await deleteRecipe(userId, recipeId);
  } catch (error) {
    console.error("Error deleting recipe", error);

    if (error instanceof Error) {
      if (error.message === "RECIPE_NOT_FOUND") {
        return { type: "error", message: "Recipe no longer exists" };
      }
      if (error.message === "RECIPE_MUST_BE_ARCHIVED") {
        return { type: "error", message: "Archive this recipe before deleting it" };
      }
      if (error.message === "RECIPE_IN_USE") {
        return {
          type: "error",
          message: "This recipe is used in a plan or log and can't be permanently deleted",
        };
      }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return {
          type: "error",
          message: "Recipe no longer exists",
        };
      }
    }

    return {
      type: "error",
      message: "Couldn't delete recipe. Try again",
    };
  }

  redirect(appendRedirectToastToPath(`${ROUTES.recipes}?view=archived`, "recipeDeleted"));
};

async function setRecipeArchivedAction(recipeId: string, archived: boolean) {
  const { id: userId } = await requireUser();

  try {
    const recipe = await setRecipeArchived(userId, recipeId, archived);
    revalidatePath(ROUTES.recipes);
    revalidatePath(ROUTES.recipe(recipe.slug));
    return { type: "success" as const };
  } catch (error) {
    console.error(`Error ${archived ? "archiving" : "restoring"} recipe`, error);
    if (error instanceof Error && error.message === "RECIPE_NOT_FOUND") {
      return { type: "error" as const, message: "Recipe no longer exists" };
    }
    return {
      type: "error" as const,
      message: archived
        ? "Couldn't archive recipe. Try again"
        : "Couldn't restore recipe. Try again",
    };
  }
}

export async function archiveRecipeAction(recipeId: string) {
  return setRecipeArchivedAction(recipeId, true);
}

export async function unarchiveRecipeAction(recipeId: string) {
  return setRecipeArchivedAction(recipeId, false);
}
