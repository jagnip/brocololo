import { describe, expect, it } from "vitest";
import { resolveUnitForConversion } from "@/lib/groceries/resolve-unit-for-conversion";

describe("resolveUnitForConversion", () => {
  const unitById = new Map([
    ["unit-g", { name: "g", namePlural: null }],
    ["unit-piece", { name: "piece", namePlural: "pieces" }],
  ]);

  it("returns nested conversion.unit when present (new unit after ingredient save)", () => {
    const unit = resolveUnitForConversion(
      {
        unitId: "unit-clove",
        unit: { name: "clove", namePlural: "cloves" },
      },
      unitById,
    );

    expect(unit).toEqual({ name: "clove", namePlural: "cloves" });
  });

  it("falls back to unitById when nested unit is missing", () => {
    const unit = resolveUnitForConversion({ unitId: "unit-piece" }, unitById);

    expect(unit).toEqual({ name: "piece", namePlural: "pieces" });
  });

  it("returns null when neither source has the unit", () => {
    const unit = resolveUnitForConversion({ unitId: "unit-unknown" }, unitById);

    expect(unit).toBeNull();
  });
});
