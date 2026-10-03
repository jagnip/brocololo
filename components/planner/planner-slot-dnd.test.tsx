import { DndContext, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { PlannerSlotDndWrapper } from "./planner-slot-dnd";

function PortaledMealNameInput() {
  const [value, setValue] = useState("");

  return createPortal(
    <input
      aria-label="Meal name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />,
    document.body,
  );
}

function TestDndWrapper({ onDragStart }: { onDragStart: () => void }) {
  const sensors = useSensors(useSensor(KeyboardSensor));

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart}>
      <PlannerSlotDndWrapper
        slotKey="2026-10-09-LUNCH"
        canDrag
        title="Custom meal"
        imageUrl={null}
      >
        <PortaledMealNameInput />
      </PlannerSlotDndWrapper>
    </DndContext>
  );
}

describe("PlannerSlotDndWrapper keyboard activation", () => {
  it("allows spaces in a portaled input without starting a drag", async () => {
    const user = userEvent.setup();
    const onDragStart = vi.fn();
    render(<TestDndWrapper onDragStart={onDragStart} />);

    const input = screen.getByRole("textbox", { name: "Meal name" });
    await user.type(input, "Beet cheese delight");

    expect(input).toHaveValue("Beet cheese delight");
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("still starts a keyboard drag from the focused card", async () => {
    const user = userEvent.setup();
    const onDragStart = vi.fn();
    render(<TestDndWrapper onDragStart={onDragStart} />);

    const card = screen.getByRole("button");
    card.focus();
    await user.keyboard(" ");

    expect(onDragStart).toHaveBeenCalledOnce();
  });
});
