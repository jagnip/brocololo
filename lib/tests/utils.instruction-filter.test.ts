import { describe, expect, it } from "vitest";
import {
  getInstructionIngredientPersonFactor,
  isInstructionIngredientVisibleForPerson,
} from "../recipes/helpers";

describe("instruction person filter visibility", () => {
  it("shows all targets when no person is selected", () => {
    // Null selection intentionally keeps the legacy unfiltered behavior.
    expect(isInstructionIngredientVisibleForPerson("BOTH", null)).toBe(true);
    expect(isInstructionIngredientVisibleForPerson("PRIMARY_ONLY", null)).toBe(true);
    expect(isInstructionIngredientVisibleForPerson("SECONDARY_ONLY", null)).toBe(true);
  });

  it("shows BOTH and PRIMARY_ONLY for Jagoda", () => {
    expect(isInstructionIngredientVisibleForPerson("BOTH", "jagoda")).toBe(true);
    expect(isInstructionIngredientVisibleForPerson("PRIMARY_ONLY", "jagoda")).toBe(true);
    expect(isInstructionIngredientVisibleForPerson("SECONDARY_ONLY", "jagoda")).toBe(
      false,
    );
  });

  it("shows BOTH and SECONDARY_ONLY for Nelson", () => {
    expect(isInstructionIngredientVisibleForPerson("BOTH", "nelson")).toBe(true);
    expect(isInstructionIngredientVisibleForPerson("PRIMARY_ONLY", "nelson")).toBe(
      false,
    );
    expect(isInstructionIngredientVisibleForPerson("SECONDARY_ONLY", "nelson")).toBe(
      true,
    );
  });
});

describe("instruction person filter amount factors", () => {
  const jagodaPortionFactor = 1 / 3;
  const nelsonPortionFactor = 2 / 3;

  it("returns identity factor when no person is selected", () => {
    expect(
      getInstructionIngredientPersonFactor(
        "BOTH",
        null,
        jagodaPortionFactor,
        nelsonPortionFactor,
      ),
    ).toBe(1);
    expect(
      getInstructionIngredientPersonFactor(
        "PRIMARY_ONLY",
        null,
        jagodaPortionFactor,
        nelsonPortionFactor,
      ),
    ).toBe(1);
  });

  it("returns identity factor for role-specific targets even when person is selected", () => {
    expect(
      getInstructionIngredientPersonFactor(
        "PRIMARY_ONLY",
        "jagoda",
        jagodaPortionFactor,
        nelsonPortionFactor,
      ),
    ).toBe(1);
    expect(
      getInstructionIngredientPersonFactor(
        "SECONDARY_ONLY",
        "nelson",
        jagodaPortionFactor,
        nelsonPortionFactor,
      ),
    ).toBe(1);
  });

  it("returns per-person split factor for BOTH targets", () => {
    expect(
      getInstructionIngredientPersonFactor(
        "BOTH",
        "jagoda",
        jagodaPortionFactor,
        nelsonPortionFactor,
      ),
    ).toBe(jagodaPortionFactor);
    expect(
      getInstructionIngredientPersonFactor(
        "BOTH",
        "nelson",
        jagodaPortionFactor,
        nelsonPortionFactor,
      ),
    ).toBe(nelsonPortionFactor);
  });
});
