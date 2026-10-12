import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { App } from "./App";
import * as staffApi from "./api/staffApi";
import type { StaffMember } from "./types";

vi.mock("./api/staffApi");

beforeEach(() => {
  vi.resetAllMocks();
});

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

test("shows an error message instead of a silent blank roster when loading fails", async () => {
  vi.mocked(staffApi.listStaff).mockRejectedValue(new Error("Failed to list staff: 500"));

  render(<App />);

  expect(await screen.findByRole("alert")).toHaveTextContent(/failed to list staff/i);
});

test("shows an error and keeps the form open when saving fails", async () => {
  vi.mocked(staffApi.listStaff).mockResolvedValue([]);
  vi.mocked(staffApi.createStaff).mockRejectedValue(new Error("Failed to create staff: 400"));

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Coach" } });
  fireEvent.click(screen.getByText("Save"));

  expect(await screen.findByRole("alert")).toHaveTextContent(/failed to create staff/i);
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});

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

function rowFor(name: string): HTMLElement {
  const match = screen.getAllByText(name).map((el) => el.closest("tr")).find((tr) => tr !== null);
  if (!match) throw new Error(`No table row found for "${name}"`);
  return match;
}

test("editing a second coach without closing the form shows that coach's own data, not the previous one", async () => {
  const coachA = member({ id: 1, name: "Coach A" });
  const coachB = member({ id: 2, name: "Coach B" });
  vi.mocked(staffApi.listStaff).mockResolvedValue([coachA, coachB]);

  render(<App />);
  await screen.findByText("Coach A");

  fireEvent.click(rowFor("Coach A"));
  fireEvent.click(screen.getByText("Edit"));
  expect(screen.getByLabelText("Name")).toHaveValue("Coach A");

  fireEvent.click(rowFor("Coach B"));
  fireEvent.click(screen.getByText("Edit"));

  expect(screen.getByLabelText("Name")).toHaveValue("Coach B");
});

test("saving after switching the edit target updates the newly selected coach, not the previous one", async () => {
  const coachA = member({ id: 1, name: "Coach A" });
  const coachB = member({ id: 2, name: "Coach B" });
  vi.mocked(staffApi.listStaff).mockResolvedValue([coachA, coachB]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(coachB);

  render(<App />);
  await screen.findByText("Coach A");

  fireEvent.click(rowFor("Coach A"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(rowFor("Coach B"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(coachB.id, {
    name: coachB.name,
    tags: coachB.tags,
    attributes: coachB.attributes,
  });
});
