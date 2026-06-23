import { describe, expect, it } from "vitest";
import { moveCategoryIdToIndex } from "@/lib/groceries/layout-category-order";

describe("moveCategoryIdToIndex", () => {
  it("moves a category id to the target index", () => {
    expect(
      moveCategoryIdToIndex({
        categoryIds: ["a", "b", "c"],
        movedCategoryId: "c",
        targetIndex: 0,
      }),
    ).toEqual(["c", "a", "b"]);
  });

  it("returns the original order when the moved id is missing", () => {
    expect(
      moveCategoryIdToIndex({
        categoryIds: ["a", "b"],
        movedCategoryId: "missing",
        targetIndex: 0,
      }),
    ).toEqual(["a", "b"]);
  });
});
