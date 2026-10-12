import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { RosterView } from "./RosterView";
import type { StaffMember } from "../types";

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
    tags: [],
    attributes: {
      authority: 1,
      determination: 1,
      motivating: 1,
      attacking: 1,
      defending: 1,
      fitness: 1,
      goalkeeping: 1,
      possession: 1,
      setPieces: 1,
      tactical: 1,
      technical: 1,
      tacticalKnowledge: 1,
    },
    categories: {
      Attacking: 1,
      Defending: 1,
      Fitness: 1,
      Goalkeeping: 1,
      Possession: 1,
      "Set Pieces": 1,
      Tactical: 1,
    },
    bestFit: "Attacking",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const staffA = member({ id: 1, name: "Coach A" });
const staffB = member({ id: 2, name: "Coach B" });

function rowFor(name: string) {
  return screen.getByText(name).closest("tr")!;
}

test("hovering a row with nothing pinned previews it in the detail panel", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  const row = rowFor("Coach A");
  fireEvent.mouseOver(row);

  expect(screen.getByText("Preview")).toBeInTheDocument();
  expect(screen.getAllByText("Coach A").length).toBeGreaterThan(1);

  fireEvent.mouseOut(row);
  expect(screen.queryByText("Preview")).not.toBeInTheDocument();
});

test("clicking a row pins it and the detail panel stays after the mouse leaves", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  const row = rowFor("Coach A");
  fireEvent.click(row);
  fireEvent.mouseOut(row);

  expect(screen.getByText("Pinned")).toBeInTheDocument();
});

test("hovering a different row while pinned shows the tooltip without changing the pinned detail", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  fireEvent.click(rowFor("Coach A"));
  fireEvent.mouseOver(rowFor("Coach B"));
  fireEvent.mouseMove(rowFor("Coach B"), { clientX: 50, clientY: 60 });

  const pinnedLabel = screen.getByText("Pinned");
  expect(pinnedLabel.closest("div")?.textContent).toContain("Coach A");

  const tooltipNames = screen.getAllByText("Coach B");
  expect(tooltipNames.length).toBeGreaterThan(1);
});

test("clicking the pinned row again unpins it", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  const row = rowFor("Coach A");
  fireEvent.click(row);
  fireEvent.click(row);

  expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
});

test("clicking a different row while one is pinned moves the pin to the new row", () => {
  render(<RosterView staff={[staffA, staffB]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  fireEvent.click(rowFor("Coach A"));
  fireEvent.click(rowFor("Coach B"));

  const pinnedLabel = screen.getByText("Pinned");
  expect(pinnedLabel.closest("div")?.textContent).toContain("Coach B");
});
