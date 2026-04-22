"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/src/generated/client";
import { ROUTES } from "@/lib/constants";
import {
  createIngredient,
  deleteIngredient,
  findAvailableSlug,
  getGramsUnit,
  getIngredientDeleteUsages,
  updateIngredient,
} from "@/lib/db/ingredients";
import {
  makeIngredientSchema,
  type IngredientFormValues,
} from "@/lib/validations/ingredient";
import type { IngredientType } from "@/types/ingredient";
import { appendRedirectToastToPath } from "@/lib/messages";

type IngredientActionError = {
  type: "error";
  message: string;
};

type IngredientActionSuccess = {
  type: "success";
  ingredient: IngredientType;
  conversionFallback?: {
    updatedRows: number;
    updatedRecipes: number;
  };
};

type IngredientInlineActionResult = IngredientActionError | IngredientActionSuccess;

function resolveDefaultUnitId(input: {
  preferredDefaultUnitId: string | null;
  unitConversions: Array<{ unitId: string }>;
  gramsUnitId: string;
}) {
  const availableUnitIds = new Set(input.unitConversions.map((conversion) => conversion.unitId));

  // Respect explicit default whenever it points to an existing conversion.
  if (
    input.preferredDefaultUnitId != null &&
    availableUnitIds.has(input.preferredDefaultUnitId)
  ) {
    return input.preferredDefaultUnitId;
  }

  // Keep existing fallback behavior stable for backward compatibility.
  if (availableUnitIds.has(input.gramsUnitId)) {
    return input.gramsUnitId;
  }

  return input.unitConversions[0]?.unitId ?? null;
}

async function saveIngredient(
  formData: IngredientFormValues,
  params: { ingredientId?: string },
): Promise<IngredientInlineActionResult> {
  const gramsUnit = await getGramsUnit();
  if (!gramsUnit) {
    return {
      type: "error",
      message: "Base unit 'g' is missing. Contact support",
    };
  }

  const parsed = makeIngredientSchema(gramsUnit.id).safeParse(formData);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Check ingredient details and try again.",
    };
  }

  const normalizedPayload = {
    ...parsed.data,
    // Normalize on the server so old clients can still submit safely.
    defaultUnitId: resolveDefaultUnitId({
      preferredDefaultUnitId: parsed.data.defaultUnitId ?? null,
      unitConversions: parsed.data.unitConversions,
      gramsUnitId: gramsUnit.id,
    }),
  };

  const slug = await findAvailableSlug(parsed.data.name, params.ingredientId);

  let ingredient: IngredientType;
  let conversionFallback: IngredientActionSuccess["conversionFallback"];

  try {
    // Keep one save path for both page and inline dialog flows.
    if (params.ingredientId) {
      const updated = await updateIngredient(
        params.ingredientId,
        {
          ...normalizedPayload,
          slug,
        },
        { gramsUnitId: gramsUnit.id },
      );
      ingredient = updated.ingredient as IngredientType;
      // Bubble up migration impact so the UI can show a non-blocking success message.
      if (updated.fallbackStats.updatedRows > 0) {
        conversionFallback = updated.fallbackStats;
      }
    } else {
      ingredient = (await createIngredient({
        ...normalizedPayload,
        slug,
      })) as IngredientType;
    }
  } catch (error) {
    console.error("Error saving ingredient", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          type: "error",
          message:
            "An ingredient with this name already exists. Try another name.",
        };
      }
    }

    return {
      type: "error",
      message: params.ingredientId
        ? "Couldn't update ingredient. Try again."
        : "Couldn't create ingredient. Try again.",
    };
  }

  return {
    type: "success",
    ingredient,
    conversionFallback,
  };
}

export const createIngredientAction = async (formData: IngredientFormValues) => {
  const result = await saveIngredient(formData, {});
  if (result.type === "error") {
    return result;
  }

  redirect(appendRedirectToastToPath(ROUTES.ingredients, "ingredientCreated"));
};

export const updateIngredientAction = async (
  ingredientId: string,
  formData: IngredientFormValues,
) => {
  const result = await saveIngredient(formData, { ingredientId });
  if (result.type === "error") {
    return result;
  }

  redirect(appendRedirectToastToPath(ROUTES.ingredients, "ingredientUpdated"));
};

export const createIngredientInlineAction = async (
  formData: IngredientFormValues,
): Promise<IngredientInlineActionResult> => {
  return saveIngredient(formData, {});
};

export const updateIngredientInlineAction = async (
  ingredientId: string,
  formData: IngredientFormValues,
): Promise<IngredientInlineActionResult> => {
  return saveIngredient(formData, { ingredientId });
};

export const deleteIngredientAction = async (ingredientId: string) => {
  const usage = await getIngredientDeleteUsages(ingredientId);

  if (usage.length > 0) {
    // Keep the toast readable if there are many linked recipes.
    const recipeList = usage
      .slice(0, 5)
      .map((item) => item.recipeName)
      .join(", ");
    const suffix = usage.length > 5 ? ` and ${usage.length - 5} more` : "";

    return {
      type: "error",
      message: `Can't delete this ingredient because it's used in: ${recipeList}${suffix}.`,
    };
  }

  try {
    await deleteIngredient(ingredientId);
  } catch (error) {
    console.error("Error deleting ingredient", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return {
          type: "error",
          message: "Can't delete this ingredient because it's used elsewhere",
        };
      }

      if (error.code === "P2025") {
        return {
          type: "error",
          message: "Ingredient no longer exists",
        };
      }
    }

    return {
      type: "error",
      message: "Couldn't delete ingredient. Try again",
    };
  }

  redirect(ROUTES.ingredients);
};
