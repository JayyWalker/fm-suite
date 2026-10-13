import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { DetailPanel } from "./DetailPanel";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Carlo Rossi",
  role: "coach",
  tags: ["Shortlist"],
  attributes: {
    authority: 5,
    determination: 6,
    motivating: 5,
    attacking: 2,
    defending: 2,
    fitness: 8,
    goalkeeping: 1,
    possession: 2,
    setPieces: 2,
    tactical: 3,
    technical: 3,
    tacticalKnowledge: 3,
  },
  categories: {
    Attacking: 2,
    Defending: 2,
    Fitness: 5,
    Goalkeeping: 1,
    Possession: 2,
    "Set Pieces": 2,
    Tactical: 3,
  },
  bestFit: "Fitness",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const scoutSample: StaffMember = {
  id: 2,
  name: "Ana Dimitriou",
  role: "scout",
  tags: [],
  attributes: {
    jpa: 5,
    jpp: 2,
    determination: 6,
    adaptability: 1,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
  } as never,
  categories: { "Current Ability Judging": 5, "Potential Judging": 2 },
  bestFit: "Current Ability Judging",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StaffMember;

const physioSample: StaffMember = {
  id: 3,
  name: "Jamie Carragher Jr.",
  role: "physio",
  tags: [],
  attributes: {
    physiotherapy: 6,
    determination: 6,
    adaptability: 2,
    manManagement: 2,
  } as never,
  categories: { Physiotherapy: 4 },
  bestFit: "Physiotherapy",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StaffMember;

const hoydSample: StaffMember = {
  id: 4,
  name: "Robbo Taylor",
  role: "hoyd",
  tags: [],
  attributes: {
    workingWithYoungsters: 6,
    jpa: 3,
    jpp: 5,
    determination: 6,
    adaptability: 2,
    manManagement: 2,
  } as never,
  categories: { "Working with Youngsters": 4, "Current Ability Judging": 2, "Potential Judging": 3 },
  bestFit: "Working with Youngsters",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StaffMember;

const dofSample: StaffMember = {
  id: 5,
  name: "Dan Ashworth Jr.",
  role: "dof",
  tags: [],
  attributes: {
    negotiating: 6,
    jpa: 3,
    jpp: 5,
    determination: 6,
    adaptability: 2,
    manManagement: 2,
  } as never,
  categories: { Negotiating: 4, "Current Ability Judging": 2, "Potential Judging": 3 },
  bestFit: "Negotiating",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StaffMember;

test("shows a placeholder when there is no staff member", () => {
  render(<DetailPanel staff={null} mode="empty" />);
  expect(screen.getByText(/hover a row/i)).toBeInTheDocument();
});

test("shows a Preview label and the full breakdown in preview mode", () => {
  render(<DetailPanel staff={sample} mode="preview" />);

  expect(screen.getByText("Preview")).toBeInTheDocument();
  expect(screen.getByText("Carlo Rossi")).toBeInTheDocument();
  expect(screen.getByText(/Fitness/)).toBeInTheDocument();
  expect(screen.queryByText("Edit")).not.toBeInTheDocument();
});

test("shows the holy trinity and categories as grade chips, not raw labels", () => {
  render(<DetailPanel staff={sample} mode="preview" />);

  // holy trinity: determination 6 -> 4 stars, authority 5 -> 3 stars, motivating 5 -> 3 stars
  expect(screen.getByText("4★ Strong")).toBeInTheDocument();
  expect(screen.getAllByText("3★ Good").length).toBeGreaterThanOrEqual(2);

  // categories: Fitness 5 -> elite, Goalkeeping 1 -> poor
  expect(screen.getByText("5★ Elite")).toBeInTheDocument();
  expect(screen.getByText("1★ Poor")).toBeInTheDocument();

  expect(screen.queryByText("Outstanding")).not.toBeInTheDocument();
});

test("shows a Pinned label and Edit/Delete buttons in pinned mode", () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={sample} mode="pinned" onEdit={onEdit} onDelete={onDelete} />);

  expect(screen.getByText("Pinned")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Edit"));
  expect(onEdit).toHaveBeenCalledWith(sample);

  fireEvent.click(screen.getByText("Delete"));
  expect(onDelete).toHaveBeenCalledWith(sample.id);
});

test("asks for confirmation naming the coach before deleting", () => {
  const onDelete = vi.fn();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={sample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Carlo Rossi"));
  expect(onDelete).toHaveBeenCalledWith(sample.id);
});

test("does not delete when the confirmation is declined", () => {
  const onDelete = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(false);

  render(<DetailPanel staff={sample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(onDelete).not.toHaveBeenCalled();
});

test("asks for confirmation naming the scout before deleting, identical to a coach", () => {
  const onDelete = vi.fn();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={scoutSample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Ana Dimitriou"));
  expect(onDelete).toHaveBeenCalledWith(scoutSample.id);
});

test("does not delete a scout when the confirmation is declined", () => {
  const onDelete = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(false);

  render(<DetailPanel staff={scoutSample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(onDelete).not.toHaveBeenCalled();
});

test("shows a scout's own mental attributes, categories, and a Regional Knowledge section", () => {
  render(<DetailPanel staff={scoutSample} mode="preview" />);

  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();
  expect(screen.getByText("determination")).toBeInTheDocument();
  expect(screen.getByText("adaptability")).toBeInTheDocument();
  expect(screen.getByText("Current Ability Judging")).toBeInTheDocument();
  expect(screen.getByText("Potential Judging")).toBeInTheDocument();
  expect(screen.getByText("Regional Knowledge")).toBeInTheDocument();
  expect(screen.getByText("Western Europe")).toBeInTheDocument();
  expect(screen.getByText("Oceania")).toBeInTheDocument();

  // determination 6 -> 4 stars; scoped to its own row since other chips can share the same text
  const determinationChip = screen.getByText("determination").nextElementSibling;
  expect(determinationChip?.textContent).toBe("4★ Strong");
});

test("shows a physio's single category and mental attributes, with no extra display section", () => {
  render(<DetailPanel staff={physioSample} mode="preview" />);

  expect(screen.getByText("Jamie Carragher Jr.")).toBeInTheDocument();
  expect(screen.getByText("determination")).toBeInTheDocument();
  expect(screen.getByText("adaptability")).toBeInTheDocument();
  expect(screen.getByText("manManagement")).toBeInTheDocument();
  expect(screen.getByText("Physiotherapy")).toBeInTheDocument();
  expect(screen.queryByText("Regional Knowledge")).not.toBeInTheDocument();
});

test("asks for confirmation naming the physio before deleting, identical to a coach or scout", () => {
  const onDelete = vi.fn();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={physioSample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Jamie Carragher Jr."));
  expect(onDelete).toHaveBeenCalledWith(physioSample.id);
});

test("shows a HoYD's three categories and mental attributes, with no extra display section", () => {
  render(<DetailPanel staff={hoydSample} mode="preview" />);

  expect(screen.getByText("Robbo Taylor")).toBeInTheDocument();
  expect(screen.getByText("determination")).toBeInTheDocument();
  expect(screen.getByText("adaptability")).toBeInTheDocument();
  expect(screen.getByText("manManagement")).toBeInTheDocument();
  expect(screen.getByText("Working with Youngsters")).toBeInTheDocument();
  expect(screen.getByText("Current Ability Judging")).toBeInTheDocument();
  expect(screen.getByText("Potential Judging")).toBeInTheDocument();
  expect(screen.queryByText("Regional Knowledge")).not.toBeInTheDocument();
});

test("asks for confirmation naming the HoYD before deleting, identical to every other role", () => {
  const onDelete = vi.fn();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={hoydSample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Robbo Taylor"));
  expect(onDelete).toHaveBeenCalledWith(hoydSample.id);
});

test("shows a DoF's three categories and mental attributes, with no extra display section", () => {
  render(<DetailPanel staff={dofSample} mode="preview" />);

  expect(screen.getByText("Dan Ashworth Jr.")).toBeInTheDocument();
  expect(screen.getByText("determination")).toBeInTheDocument();
  expect(screen.getByText("adaptability")).toBeInTheDocument();
  expect(screen.getByText("manManagement")).toBeInTheDocument();
  expect(screen.getByText("Negotiating")).toBeInTheDocument();
  expect(screen.getByText("Current Ability Judging")).toBeInTheDocument();
  expect(screen.getByText("Potential Judging")).toBeInTheDocument();
  expect(screen.queryByText("Regional Knowledge")).not.toBeInTheDocument();
});

test("asks for confirmation naming the DoF before deleting, identical to every other role", () => {
  const onDelete = vi.fn();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<DetailPanel staff={dofSample} mode="pinned" onDelete={onDelete} />);

  fireEvent.click(screen.getByText("Delete"));

  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Dan Ashworth Jr."));
  expect(onDelete).toHaveBeenCalledWith(dofSample.id);
});
