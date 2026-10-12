import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { DetailPanel } from "./DetailPanel";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Carlo Rossi",
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
