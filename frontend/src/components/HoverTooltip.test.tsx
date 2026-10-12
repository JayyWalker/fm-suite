import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { HoverTooltip } from "./HoverTooltip";
import type { StaffMember } from "../types";

const sample: StaffMember = {
  id: 1,
  name: "Ana Dimitriou",
  role: "coach",
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

const scoutSample: StaffMember = {
  id: 2,
  name: "Marcus Webb",
  role: "scout",
  tags: [],
  attributes: {
    jpa: 6,
    jpp: 2,
    determination: 8,
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
  categories: { "Current Ability Judging": 4, "Potential Judging": 1 },
  bestFit: "Current Ability Judging",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as StaffMember;

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

test("shows the holy trinity and best fit as grade chips, not raw numbers", () => {
  render(<HoverTooltip staff={sample} position={{ x: 0, y: 0 }} />);

  // determination 8 -> 5 stars, motivating 6 -> 4 stars, best fit Tactical (5) -> 5 stars
  expect(screen.getAllByText("5★ Elite").length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText("4★ Strong")).toBeInTheDocument();
  expect(screen.queryByText("8")).not.toBeInTheDocument();
});

test("shows a scout's own mental fields (determination, adaptability), not the coach's holy trinity", () => {
  render(<HoverTooltip staff={scoutSample} position={{ x: 0, y: 0 }} />);

  expect(screen.getByText("Marcus Webb")).toBeInTheDocument();
  expect(screen.getByText("determination")).toBeInTheDocument();
  expect(screen.getByText("adaptability")).toBeInTheDocument();
  expect(screen.queryByText("authority")).not.toBeInTheDocument();
  expect(screen.queryByText("motivating")).not.toBeInTheDocument();
  expect(screen.getByText(/Current Ability Judging/)).toBeInTheDocument();
});
