import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { HoverTooltip } from "./HoverTooltip";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Ana Dimitriou",
  tags: [],
  attributes: {
    authority: 8,
    determination: 8,
    motivating: 6,
    attacking: 3,
    defending: 3,
    fitness: 2,
    goalkeeping: 1,
    possession: 4,
    setPieces: 3,
    tactical: 8,
    technical: 8,
    tacticalKnowledge: 8,
  },
  categories: {
    Attacking: 3,
    Defending: 3,
    Fitness: 2,
    Goalkeeping: 1,
    Possession: 3,
    "Set Pieces": 3,
    Tactical: 5,
  },
  bestFit: "Tactical",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("renders nothing when there is no staff member", () => {
  const { container } = render(<HoverTooltip staff={null} position={{ x: 10, y: 10 }} />);
  expect(container).toBeEmptyDOMElement();
});

test("renders nothing when there is no position", () => {
  const { container } = render(<HoverTooltip staff={sample} position={null} />);
  expect(container).toBeEmptyDOMElement();
});

test("renders the staff member's holy trinity and best fit at the given position", () => {
  render(<HoverTooltip staff={sample} position={{ x: 42, y: 24 }} />);

  expect(screen.getByText("Ana Dimitriou")).toBeInTheDocument();
  expect(screen.getByText(/Tactical/)).toBeInTheDocument();

  const tooltip = screen.getByText("Ana Dimitriou").parentElement!;
  expect(tooltip.style.left).toBe("42px");
  expect(tooltip.style.top).toBe("24px");
});
