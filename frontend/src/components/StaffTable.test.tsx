import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffTable } from "./StaffTable";
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

test("renders a row per staff member with name, tags, and best fit", () => {
  const staff = [member({ id: 1, name: "Carlo Rossi", tags: ["Shortlist"], bestFit: "Fitness" })];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  expect(screen.getByText("Shortlist")).toBeInTheDocument();
  const row = screen.getByText("Carlo Rossi").closest("tr")!;
  expect(row.textContent).toContain("Fitness");
});

test("calls onRowHover with the staff id on mouse over and null on mouse out", () => {
  const staff = [member({ id: 7, name: "Hover Target" })];
  const onRowHover = vi.fn();

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={onRowHover} onRowClick={vi.fn()} />);

  const row = screen.getByText("Hover Target").closest("tr")!;
  fireEvent.mouseOver(row);
  expect(onRowHover).toHaveBeenCalledWith(7);

  fireEvent.mouseOut(row);
  expect(onRowHover).toHaveBeenCalledWith(null);
});

test("calls onRowClick with the staff id when a row is clicked", () => {
  const staff = [member({ id: 9, name: "Click Target" })];
  const onRowClick = vi.fn();

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={onRowClick} />);

  fireEvent.click(screen.getByText("Click Target"));
  expect(onRowClick).toHaveBeenCalledWith(9);
});

test("sorting by category star rating reorders the rows, highest first", () => {
  const staff = [
    member({ id: 1, name: "LowFitness", categories: { ...member({}).categories, Fitness: 2 } }),
    member({ id: 2, name: "HighFitness", categories: { ...member({}).categories, Fitness: 5 } }),
  ];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  fireEvent.change(screen.getByLabelText("Sort by category"), { target: { value: "Fitness" } });

  const names = screen.getAllByRole("row").slice(1).map((row) => row.textContent);
  expect(names[0]).toContain("HighFitness");
  expect(names[1]).toContain("LowFitness");
});
