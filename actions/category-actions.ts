"use server";

import { createRecipeCategory } from "@/lib/db/categories";
import {
  createRecipeCategorySchema,
  type CreateRecipeCategoryInput,
} from "@/lib/validations/category";

type CreateRecipeCategoryActionResult =
  | {
      type: "success";
      category: {
        id: string;
        name: string;
        slug: string;
        type: "PROTEIN" | "RECIPE_TYPE";
        parentId: string | null;
      };
    }
  | { type: "error"; message: string };

export async function createRecipeCategoryAction(
  formData: CreateRecipeCategoryInput,
): Promise<CreateRecipeCategoryActionResult> {
  const parsed = createRecipeCategorySchema.safeParse(formData);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Check category details and try again",
    };
  }

  try {
    const category = await createRecipeCategory(parsed.data);
    return {
      type: "success",
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        // createRecipeCategorySchema limits kind to PROTEIN/RECIPE_TYPE.
        type: parsed.data.kind,
        parentId: category.parentId,
      },
    };
  } catch (error) {
    console.error("Error creating category", error);
    return {
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Couldn't create category. Try again",
    };
  }
}
