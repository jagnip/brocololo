import { describe, expect, it } from "vitest";
import { findLogContainingDate, type LogListEntry } from "./logs";

function mockLog(
  id: string,
  start: string,
  end: string,
): LogListEntry {
  return {
    id,
    createdAt: new Date(),
    plan: {
      id: `plan-${id}`,
      startDate: new Date(`${start}T12:00:00.000Z`),
      endDate: new Date(`${end}T12:00:00.000Z`),
    },
  };
}

describe("findLogContainingDate", () => {
  it("returns the log whose plan range contains the date", () => {
    const logs = [
      mockLog("newest", "2026-04-01", "2026-04-07"),
      mockLog("active", "2026-03-10", "2026-03-16"),
    ];
    const found = findLogContainingDate(logs, new Date("2026-03-12T00:00:00.000Z"));
    expect(found?.id).toBe("active");
  });

  it("returns undefined when no plan contains the date", () => {
    const logs = [mockLog("a", "2026-01-01", "2026-01-07")];
    const found = findLogContainingDate(logs, new Date("2026-06-01T00:00:00.000Z"));
    expect(found).toBeUndefined();
  });

  it("treats start and end dates as inclusive", () => {
    const logs = [mockLog("active", "2026-03-10", "2026-03-16")];

    const startBoundary = findLogContainingDate(
      logs,
      new Date("2026-03-10T00:00:00.000Z"),
    );
    const endBoundary = findLogContainingDate(
      logs,
      new Date("2026-03-16T23:59:59.999Z"),
    );

    expect(startBoundary?.id).toBe("active");
    expect(endBoundary?.id).toBe("active");
  });
});
