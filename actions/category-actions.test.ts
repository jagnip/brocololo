import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipeCategory } from "@/lib/db/categories";
import type { Category } from "@/src/generated/client";
import { createRecipeCategoryAction } from "./category-actions";

vi.mock("@/lib/db/categories", () => ({
  createRecipeCategory: vi.fn(),
}));

describe("createRecipeCategoryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error when category name is blank", async () => {
    const result = await createRecipeCategoryAction({
      flavourSlug: "savoury",
      kind: "RECIPE_TYPE",
      name: "   ",
    });

    expect(result).toEqual({
      type: "error",
      message: "Category name is required",
    });
    expect(createRecipeCategory).not.toHaveBeenCalled();
  });

  it("creates category from parsed/normalized input", async () => {
    vi.mocked(createRecipeCategory).mockResolvedValue({
      id: "cat-1",
      name: "Sweet pies",
      slug: "sweet-pies",
      type: "RECIPE_TYPE",
      parentId: "flavour-sweet",
    } as Category);

    const result = await createRecipeCategoryAction({
      flavourSlug: "sweet",
      kind: "RECIPE_TYPE",
      name: "  Sweet   pies  ",
    });

    expect(createRecipeCategory).toHaveBeenCalledWith({
      flavourSlug: "sweet",
      kind: "RECIPE_TYPE",
      name: "Sweet pies",
    });
    expect(result).toEqual({
      type: "success",
      category: {
        id: "cat-1",
        name: "Sweet pies",
        slug: "sweet-pies",
        type: "RECIPE_TYPE",
        parentId: "flavour-sweet",
      },
    });
  });

  it("returns db error message to caller", async () => {
    vi.mocked(createRecipeCategory).mockRejectedValue(
      new Error("A category with this name already exists."),
    );

    const result = await createRecipeCategoryAction({
      flavourSlug: "savoury",
      kind: "PROTEIN",
      name: "Fish",
    });

    expect(result).toEqual({
      type: "error",
      message: "A category with this name already exists.",
    });
  });
});
