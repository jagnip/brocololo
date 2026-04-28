import { beforeEach, describe, expect, it, vi } from "vitest";
import { findIngredientIdentityDuplicate } from "./ingredients";

vi.mock("./index", () => ({
  prisma: {
    ingredient: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "./index";

describe("findIngredientIdentityDuplicate", () => {
  const findFirstMock = vi.mocked(prisma.ingredient.findFirst);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks ingredient identity case-insensitively", async () => {
    findFirstMock.mockResolvedValue({ id: "ingredient-1" });

    const result = await findIngredientIdentityDuplicate({
      name: "Chicken thighs",
      descriptor: "Boneless",
      brand: "Tesco",
      categoryId: "category-1",
    });

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        name: { equals: "Chicken thighs", mode: "insensitive" },
        descriptor: { equals: "Boneless", mode: "insensitive" },
        brand: { equals: "Tesco", mode: "insensitive" },
        categoryId: "category-1",
      },
      select: { id: true },
    });
    expect(result).toEqual({ id: "ingredient-1" });
  });

  it("keeps null descriptor and brand as null identity parts", async () => {
    findFirstMock.mockResolvedValue(null);

    await findIngredientIdentityDuplicate({
      name: "Chicken thighs",
      descriptor: null,
      brand: null,
      categoryId: "category-1",
      excludeIngredientId: "current-ingredient",
    });

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        name: { equals: "Chicken thighs", mode: "insensitive" },
        descriptor: null,
        brand: null,
        categoryId: "category-1",
        id: { not: "current-ingredient" },
      },
      select: { id: true },
    });
  });

  it("scopes duplicate check by categoryId", async () => {
    findFirstMock.mockResolvedValue(null);

    await findIngredientIdentityDuplicate({
      name: "Apple",
      descriptor: null,
      brand: null,
      categoryId: "cat-fruits",
    });

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: "cat-fruits" }),
      }),
    );
  });
});
