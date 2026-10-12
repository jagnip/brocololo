import { describe, expect, it } from "vitest";
import { planBatchesSaveSchema } from "./planner";

const validBatch = {
  id: "batch-1",
  recipeId: "recipe-1",
  storageRows: [
    { count: 2, cookingFamilyMemberIds: ["member-1", "member-2"] },
  ],
  extraPortions: 0,
};

describe("planBatchesSaveSchema", () => {
  it("accepts zero storage rows and zero extra portions", () => {
    expect(
      planBatchesSaveSchema.parse([
        { ...validBatch, storageRows: [], extraPortions: 0 },
      ]),
    ).toHaveLength(1);
  });

  it("rejects invalid counts, empty audiences, and duplicate ids", () => {
    expect(() =>
      planBatchesSaveSchema.parse([
        {
          ...validBatch,
          storageRows: [{ count: 0, cookingFamilyMemberIds: [] }],
          extraPortions: -1,
        },
      ]),
    ).toThrow();
    expect(() =>
      planBatchesSaveSchema.parse([validBatch, validBatch]),
    ).toThrow("Batch ids must be unique");
  });

  it("normalizes duplicate audience ids", () => {
    expect(
      planBatchesSaveSchema.parse([
        {
          ...validBatch,
          storageRows: [
            {
              count: 1,
              cookingFamilyMemberIds: ["member-1", "member-1"],
            },
          ],
        },
      ])[0]?.storageRows[0]?.cookingFamilyMemberIds,
    ).toEqual(["member-1"]);
  });
});
