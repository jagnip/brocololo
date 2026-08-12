import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  formatPortionSplitBadgeLabel,
  PortionSplitCard,
  type PortionSplitAudienceMember,
} from "@/components/recipes/recipe-page/portion-split-card";

const jagoda: PortionSplitAudienceMember = {
  id: "family-self",
  label: "Jagoda",
  sortOrder: 0,
  multiplier: 1,
  mealCount: 1,
};

const nelson: PortionSplitAudienceMember = {
  id: "family-member-1",
  label: "Nelson",
  sortOrder: 1,
  multiplier: 1,
  mealCount: 1,
};

const gloria: PortionSplitAudienceMember = {
  id: "family-member-2",
  label: "Gloria",
  sortOrder: 2,
  multiplier: 1,
  mealCount: 1,
};

const klaudia: PortionSplitAudienceMember = {
  id: "family-member-3",
  label: "Klaudia",
  sortOrder: 3,
  multiplier: 1,
  mealCount: 1,
};

describe("formatPortionSplitBadgeLabel", () => {
  it("formats singular/plural portions with a middot", () => {
    expect(formatPortionSplitBadgeLabel("Jagoda", 1, 1)).toBe(
      "Jagoda · 1 portion",
    );
    expect(formatPortionSplitBadgeLabel("Jagoda", 5, 1)).toBe(
      "Jagoda · 5 portions",
    );
  });

  it("puts a non-default multiplier in parentheses as Nx", () => {
    expect(formatPortionSplitBadgeLabel("Nelson", 5, 2)).toBe(
      "Nelson · 5 portions (2x)",
    );
    expect(formatPortionSplitBadgeLabel("Nelson", 4, 1.5)).toBe(
      "Nelson · 4 portions (1.5x)",
    );
  });
});

describe("PortionSplitCard", () => {
  it("shows a 1-meal title and portion badges without ×1", () => {
    render(
      <PortionSplitCard
        members={[jagoda, nelson]}
        totalMealCount={1}
        extraPortions={0}
      />,
    );

    expect(
      screen.getByText("Portion split for this cook (1 meal)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Jagoda")).toBeInTheDocument();
    expect(screen.getByText("Nelson")).toBeInTheDocument();
    expect(screen.getAllByText("· 1 portion")).toHaveLength(2);
    expect(screen.queryByText(/×1/)).toBeNull();
    expect(screen.queryByText(/\(1x\)/)).toBeNull();
  });

  it("appends (2x) on the badge when a multiplier is set", () => {
    render(
      <PortionSplitCard
        members={[{ ...nelson, multiplier: 2 }]}
        totalMealCount={1}
      />,
    );

    expect(screen.getByText("· 1 portion (2x)")).toBeInTheDocument();
  });

  it("shows multi-meal counts for uneven audiences", () => {
    render(
      <PortionSplitCard
        members={[
          { ...jagoda, mealCount: 5 },
          { ...nelson, mealCount: 5, multiplier: 2 },
          { ...gloria, mealCount: 4 },
          { ...klaudia, mealCount: 4 },
        ]}
        totalMealCount={5}
      />,
    );

    expect(
      screen.getByText("Portion split for this cook (5 meals)"),
    ).toBeInTheDocument();
    expect(screen.getByText("· 5 portions")).toBeInTheDocument();
    expect(screen.getByText("· 5 portions (2x)")).toBeInTheDocument();
    expect(screen.getAllByText("· 4 portions")).toHaveLength(2);
  });

  it("still renders for a single person cooking multiple meals", () => {
    render(
      <PortionSplitCard
        members={[{ ...jagoda, mealCount: 5 }]}
        totalMealCount={5}
      />,
    );

    expect(
      screen.getByText("Portion split for this cook (5 meals)"),
    ).toBeInTheDocument();
    expect(screen.getByText("· 5 portions")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /Portion split for this cook \(5 meals\): Jagoda · 5 portions/,
      }),
    ).toBeInTheDocument();
  });

  it("shows muted extras chip matching person badge structure", () => {
    render(
      <PortionSplitCard
        members={[jagoda, nelson]}
        totalMealCount={1}
        extraPortions={3}
      />,
    );

    expect(screen.getByText("Extra")).toBeInTheDocument();
    expect(screen.getByText("· 3 portions")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: /Extra · 3 portions/,
      }),
    ).toBeInTheDocument();
  });

  it("does not toggle people off when a chip is clicked", async () => {
    const user = userEvent.setup();
    render(
      <PortionSplitCard members={[jagoda, nelson]} totalMealCount={1} />,
    );

    // Read-only mirrors: no buttons / no aria-pressed chips.
    expect(screen.queryByRole("button")).toBeNull();
    await user.click(screen.getByText("Nelson"));
    expect(screen.getByText("Nelson")).toBeInTheDocument();
    expect(screen.getByText("Jagoda")).toBeInTheDocument();
  });

  it("returns null when there are no people and no extras", () => {
    const { container } = render(
      <PortionSplitCard members={[]} totalMealCount={1} extraPortions={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
