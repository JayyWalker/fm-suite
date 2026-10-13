import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffTable } from "./StaffTable";
import type { StaffMember } from "../types";

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
    role: "coach",
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
  } as StaffMember;
}

function scoutMember(overrides: Partial<StaffMember>): StaffMember {
  return member({
    role: "scout",
    attributes: { jpa: 5, jpp: 5, determination: 5, adaptability: 5 } as never,
    categories: { "Current Ability Judging": 3, "Potential Judging": 4 },
    bestFit: "Potential Judging",
    ...overrides,
  } as Partial<StaffMember>);
}

test("renders a row per staff member with name, tags, and best fit", () => {
  const staff = [member({ id: 1, name: "Carlo Rossi", tags: ["Shortlist"], bestFit: "Fitness" })];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  const row = screen.getByText("Carlo Rossi").closest("tr")!;
  expect(row.textContent).toContain("Shortlist");
  expect(row.textContent).toContain("Fitness");
});

test("shows the best-fit category as a grade chip", () => {
  const staff = [
    member({ id: 1, name: "Chip Target", bestFit: "Fitness", categories: { ...member({}).categories, Fitness: 4 } }),
  ];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  const row = screen.getByText("Chip Target").closest("tr")!;
  expect(row.textContent).toContain("4★ Strong");
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

test("moving the cursor between cells in the same row does not clear the hover preview", () => {
  const staff = [member({ id: 7, name: "Hover Target" })];
  const onRowHover = vi.fn();

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={onRowHover} onRowClick={vi.fn()} />);

  const row = screen.getByText("Hover Target").closest("tr")!;
  const [nameCell, tagsCell] = row.querySelectorAll("td");

  fireEvent.mouseOver(nameCell);
  expect(onRowHover).toHaveBeenCalledWith(7);
  onRowHover.mockClear();

  fireEvent.mouseOut(nameCell, { relatedTarget: tagsCell });
  fireEvent.mouseOver(tagsCell, { relatedTarget: nameCell });

  expect(onRowHover).not.toHaveBeenCalledWith(null);
});

test("renders a toggleable chip for each distinct tag and filters the table by the active ones", () => {
  const staff = [
    member({ id: 1, name: "Shortlisted Coach", tags: ["Shortlist"] }),
    member({ id: 2, name: "U18 Coach", tags: ["U18"] }),
    member({ id: 3, name: "Untagged Coach", tags: [] }),
    scoutMember({ id: 4, name: "Shortlisted Scout", tags: ["Shortlist"] }),
  ];

  render(<StaffTable staff={staff} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Shortlisted Coach")).toBeInTheDocument();
  expect(screen.getByText("U18 Coach")).toBeInTheDocument();
  expect(screen.getByText("Untagged Coach")).toBeInTheDocument();
  expect(screen.getByText("Shortlisted Scout")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Shortlist" }));

  expect(screen.getByText("Shortlisted Coach")).toBeInTheDocument();
  expect(screen.getByText("Shortlisted Scout")).toBeInTheDocument();
  expect(screen.queryByText("U18 Coach")).not.toBeInTheDocument();
  expect(screen.queryByText("Untagged Coach")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Shortlist" }));

  expect(screen.getByText("U18 Coach")).toBeInTheDocument();
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

test("a Type filter chip narrows the roster to just that role", () => {
  const coach = member({ id: 1, name: "Carlo Rossi" });
  const scout = scoutMember({ id: 2, name: "Ana Dimitriou" });

  render(<StaffTable staff={[coach, scout]} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Scout" }));

  expect(screen.queryByText("Carlo Rossi")).not.toBeInTheDocument();
  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();
});

test("clicking the Type column header sorts the roster by role", () => {
  const scout = scoutMember({ id: 1, name: "Scout Member" });
  const coach = member({ id: 2, name: "Coach Member" });

  render(<StaffTable staff={[scout, coach]} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  fireEvent.click(screen.getByText("Type"));

  const names = screen.getAllByRole("row").slice(1).map((row) => row.textContent);
  expect(names[0]).toContain("Coach Member");
  expect(names[1]).toContain("Scout Member");
});

test("the category sort dropdown lists categories from every role present, not just one", () => {
  const coach = member({ id: 1 });
  const scout = scoutMember({ id: 2 });

  render(<StaffTable staff={[coach, scout]} pinnedId={null} onRowHover={vi.fn()} onRowClick={vi.fn()} />);

  const select = screen.getByLabelText("Sort by category") as HTMLSelectElement;
  const optionValues = Array.from(select.options).map((option) => option.value);
  expect(optionValues).toContain("Fitness");
  expect(optionValues).toContain("Potential Judging");
});
