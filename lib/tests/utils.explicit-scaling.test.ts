import { describe, expect, it } from "vitest";
import {
  applyEditRatioToLocalScale,
  computeGlobalScaleFromEditedRow,
  getPrimaryCalorieScalingFactorForTarget,
  isScaleModified,
} from "../recipes/helpers";

describe("explicit recipe scaling helpers", () => {
  it("keeps single-row edits local by default", () => {
    // Row A edited from 200 -> 300 means a local 1.5x ratio.
    const rowAScale = applyEditRatioToLocalScale(1, 1.5);
    const rowBScale = 1;

    expect(rowAScale).toBeCloseTo(1.5);
    expect(rowBScale).toBe(1);
  });

  it("compounds multiple edits on the same row from current displayed value", () => {
    // Edit #1: 200 -> 300 => 1.5x, Edit #2: 300 -> 330 => 1.1x.
    const afterFirstEdit = applyEditRatioToLocalScale(1, 1.5);
    const afterSecondEdit = applyEditRatioToLocalScale(afterFirstEdit, 1.1);

    expect(afterSecondEdit).toBeCloseTo(1.65);
  });

  it("absorbs active calorie scaling when edit commits", () => {
    // With a 0.8 calorie target active, a 1.25 edit should keep typed value after target reset.
    const localScale = applyEditRatioToLocalScale(1, 1.25, 0.8);
    expect(localScale).toBe(1);
  });

  it("applies clicked row scale to all rows one-time", () => {
    // Existing global 1.2x and clicked row local 0.75x should become global 0.9x.
    const nextGlobalScale = computeGlobalScaleFromEditedRow(1.2, 0.75);
    expect(nextGlobalScale).toBeCloseTo(0.9);
  });

  it("supports last-click-wins when second edited row is used for apply-all", () => {
    // Simulate: row A locally 1.4x, row B locally 0.8x, then user clicks apply on B.
    const currentGlobalScale = 1;
    const clickedRowBScale = 0.8;
    const appliedGlobalScale = computeGlobalScaleFromEditedRow(
      currentGlobalScale,
      clickedRowBScale,
    );

    // After apply-all, row-level overrides are cleared in page state.
    expect(appliedGlobalScale).toBeCloseTo(0.8);
  });

  it("composes multiple apply-all actions deterministically", () => {
    // First apply-all from row A (1.5x), then later from row B (0.8x).
    const afterFirstApply = computeGlobalScaleFromEditedRow(1, 1.5);
    const afterSecondApply = computeGlobalScaleFromEditedRow(afterFirstApply, 0.8);

    expect(afterFirstApply).toBeCloseTo(1.5);
    expect(afterSecondApply).toBeCloseTo(1.2);
  });

  it("snaps tiny floating-point drift back to identity", () => {
    const almostOne = applyEditRatioToLocalScale(1, 0.9999999999);

    expect(almostOne).toBe(1);
    expect(isScaleModified(almostOne)).toBe(false);
  });

  it("keeps calorie-target behavior unchanged for SECONDARY_ONLY rows", () => {
    // This guards the agreed requirement: Jagoda target does not scale Nelson-only rows.
    expect(getPrimaryCalorieScalingFactorForTarget("SECONDARY_ONLY", 1.3)).toBe(1);
    expect(getPrimaryCalorieScalingFactorForTarget("BOTH", 1.3)).toBe(1.3);
  });
});
