"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants";
import { requireUser } from "@/lib/auth/session";
import {
  addIngredientToList,
  createIngredientList,
  deleteIngredientList,
  removeIngredientFromList,
  renameIngredientList,
} from "@/lib/db/ingredient-lists";
import {
  addIngredientToListSchema,
  createIngredientListSchema,
  deleteIngredientListSchema,
  removeIngredientFromListSchema,
  renameIngredientListSchema,
} from "@/lib/validations/ingredient-list";

function revalidateGroceriesPaths(planId: string) {
  revalidatePath(ROUTES.groceries);
  revalidatePath(ROUTES.groceriesEdit(planId));
}

export async function createIngredientListAction(input: unknown): Promise<
  | { type: "success"; listId: string }
  | { type: "error"; message: string }
> {
  const parsed = createIngredientListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ?? "Could not create list. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    const list = await createIngredientList({ userId, name: parsed.data.name });
    revalidateGroceriesPaths(parsed.data.planId);
    return { type: "success", listId: list.id };
  } catch {
    return { type: "error", message: "Could not create list. Try again." };
  }
}

export async function renameIngredientListAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = renameIngredientListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message:
        parsed.error.issues[0]?.message ?? "Could not rename list. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    await renameIngredientList({
      userId,
      id: parsed.data.listId,
      name: parsed.data.name,
    });
    revalidateGroceriesPaths(parsed.data.planId);
    return { type: "success" };
  } catch {
    return { type: "error", message: "Could not rename list. Try again." };
  }
}

export async function deleteIngredientListAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = deleteIngredientListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not delete list. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    await deleteIngredientList({ userId, id: parsed.data.listId });
    revalidateGroceriesPaths(parsed.data.planId);
    return { type: "success" };
  } catch {
    return { type: "error", message: "Could not delete list. Try again." };
  }
}

export async function addIngredientToListAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = addIngredientToListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not add ingredient to list. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    await addIngredientToList({
      userId,
      listId: parsed.data.listId,
      ingredientId: parsed.data.ingredientId,
    });
    revalidateGroceriesPaths(parsed.data.planId);
    return { type: "success" };
  } catch {
    return {
      type: "error",
      message: "Could not add ingredient to list. Try again.",
    };
  }
}

export async function removeIngredientFromListAction(input: unknown): Promise<
  { type: "success" } | { type: "error"; message: string }
> {
  const parsed = removeIngredientFromListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      type: "error",
      message: "Could not remove ingredient from list. Try again.",
    };
  }

  try {
    const { id: userId } = await requireUser();
    await removeIngredientFromList({
      userId,
      listId: parsed.data.listId,
      ingredientId: parsed.data.ingredientId,
    });
    revalidateGroceriesPaths(parsed.data.planId);
    return { type: "success" };
  } catch {
    return {
      type: "error",
      message: "Could not remove ingredient from list. Try again.",
    };
  }
}
