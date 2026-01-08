"use server";

import { createRecipe } from "@/lib/db/recipes";
import { InsertRecipeOutputType } from "@/lib/validations/recipe";
import { redirect } from "next/navigation";

export const createRecipeAction = async (

  formData: InsertRecipeOutputType
) => {

    let recipe;
    
  try {
    recipe = await createRecipe(formData);
  } catch (error) {
    console.error("Error", error);
    return {
      type: "error",
      message: "Failed to create recipe",
    };
  }

  redirect(`/recipes/${recipe.slug}`);
};