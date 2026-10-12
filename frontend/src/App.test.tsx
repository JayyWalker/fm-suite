import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { App } from "./App";
import * as staffApi from "./api/staffApi";
import type { StaffMember } from "./types";

vi.mock("./api/staffApi");

function member(overrides: Partial<StaffMember>): StaffMember {
  return {
    id: 1,
    name: "Z",
    tags: [],
    attributes: {
      authority: 4,
      determination: 4,
      motivating: 4,
      attacking: 4,
      defending: 4,
      fitness: 4,
      goalkeeping: 4,
      possession: 4,
      setPieces: 4,
      tactical: 4,
      technical: 4,
      tacticalKnowledge: 4,
    },
    categories: {
      Attacking: 3,
      Defending: 3,
      Fitness: 3,
      Goalkeeping: 3,
      Possession: 3,
      "Set Pieces": 3,
      Tactical: 3,
    },
    bestFit: "Attacking",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("loads and displays staff on mount", async () => {
  vi.mocked(staffApi.listStaff).mockResolvedValue([member({ id: 1, name: "Carlo Rossi" })]);

  render(<App />);

  expect(await screen.findByText("Carlo Rossi")).toBeInTheDocument();
});

test("submitting the add-staff form creates a staff member and refreshes the list", async () => {
  vi.mocked(staffApi.listStaff)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([member({ id: 2, name: "New Coach" })]);
  vi.mocked(staffApi.createStaff).mockResolvedValue(member({ id: 2, name: "New Coach" }));

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Coach" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.createStaff).toHaveBeenCalledTimes(1));
  expect(await screen.findByText("New Coach")).toBeInTheDocument();
});
