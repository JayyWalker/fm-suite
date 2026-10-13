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
    role: "coach",
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
  } as StaffMember;
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
  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
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

test("submitting the add-staff form for a coach creates it and refreshes the list", async () => {
  vi.mocked(staffApi.listStaff)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([member({ id: 2, name: "New Coach" })]);
  vi.mocked(staffApi.createStaff).mockResolvedValue(member({ id: 2, name: "New Coach" }));

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Coach" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.createStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.createStaff).toHaveBeenCalledWith(expect.objectContaining({ role: "coach", name: "New Coach" }));
  expect(await screen.findByText("New Coach")).toBeInTheDocument();
});

test("submitting the add-staff form for a scout creates it with the scout role", async () => {
  const newScout = member({
    id: 3,
    name: "New Scout",
    role: "scout",
    attributes: { jpa: 4, jpp: 4, determination: 4, adaptability: 4 } as never,
    categories: { "Current Ability Judging": 3, "Potential Judging": 3 },
    bestFit: "Current Ability Judging",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValueOnce([]).mockResolvedValueOnce([newScout]);
  vi.mocked(staffApi.createStaff).mockResolvedValue(newScout);

  render(<App />);

  fireEvent.click(await screen.findByText("Add staff"));
  fireEvent.click(screen.getByRole("button", { name: "Scout" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Scout" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.createStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.createStaff).toHaveBeenCalledWith(expect.objectContaining({ role: "scout", name: "New Scout" }));
  expect(await screen.findByText("New Scout")).toBeInTheDocument();
});

test("editing a physio and saving sends its own attributes without a role key", async () => {
  const physio = member({
    id: 4,
    name: "Physio One",
    role: "physio",
    attributes: { physiotherapy: 5, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { Physiotherapy: 4 },
    bestFit: "Physiotherapy",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([physio]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(physio);

  render(<App />);
  await screen.findByText("Physio One");

  fireEvent.click(rowFor("Physio One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(physio.id, {
    name: physio.name,
    tags: physio.tags,
    attributes: physio.attributes,
  });
});

test("editing a HoYD and saving sends its own attributes without a role key", async () => {
  const hoyd = member({
    id: 5,
    name: "HoYD One",
    role: "hoyd",
    attributes: { workingWithYoungsters: 5, jpa: 4, jpp: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { "Working with Youngsters": 4, "Current Ability Judging": 3, "Potential Judging": 3 },
    bestFit: "Working with Youngsters",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([hoyd]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(hoyd);

  render(<App />);
  await screen.findByText("HoYD One");

  fireEvent.click(rowFor("HoYD One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(hoyd.id, {
    name: hoyd.name,
    tags: hoyd.tags,
    attributes: hoyd.attributes,
  });
});

test("editing a DoF and saving sends its own attributes without a role key", async () => {
  const dof = member({
    id: 6,
    name: "DoF One",
    role: "dof",
    attributes: { negotiating: 5, jpa: 4, jpp: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { Negotiating: 4, "Current Ability Judging": 3, "Potential Judging": 3 },
    bestFit: "Negotiating",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([dof]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(dof);

  render(<App />);
  await screen.findByText("DoF One");

  fireEvent.click(rowFor("DoF One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(dof.id, {
    name: dof.name,
    tags: dof.tags,
    attributes: dof.attributes,
  });
});

test("editing a Data Analyst and saving sends its own attributes without a role key", async () => {
  const dataAnalyst = member({
    id: 7,
    name: "Data Analyst One",
    role: "dataAnalyst",
    attributes: {
      judgingPlayerData: 5,
      judgingTeamData: 4,
      presentingData: 4,
      determination: 4,
      adaptability: 4,
      manManagement: 4,
    } as never,
    categories: { "Judging Player Data": 4, "Judging Team Data": 3, "Presenting Data": 3 },
    bestFit: "Judging Player Data",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([dataAnalyst]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(dataAnalyst);

  render(<App />);
  await screen.findByText("Data Analyst One");

  fireEvent.click(rowFor("Data Analyst One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(dataAnalyst.id, {
    name: dataAnalyst.name,
    tags: dataAnalyst.tags,
    attributes: dataAnalyst.attributes,
  });
});

test("editing a Sports Scientist and saving sends its own attributes without a role key", async () => {
  const sportsScientist = member({
    id: 8,
    name: "Sports Scientist One",
    role: "sportsScientist",
    attributes: { fitness: 5, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { Fitness: 4 },
    bestFit: "Fitness",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([sportsScientist]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(sportsScientist);

  render(<App />);
  await screen.findByText("Sports Scientist One");

  fireEvent.click(rowFor("Sports Scientist One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(sportsScientist.id, {
    name: sportsScientist.name,
    tags: sportsScientist.tags,
    attributes: sportsScientist.attributes,
  });
});

test("editing a Head of Sports Science and saving sends its own attributes without a role key", async () => {
  const headOfSportsScience = member({
    id: 9,
    name: "Head Scientist One",
    role: "headOfSportsScience",
    attributes: { fitness: 5, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { Fitness: 4 },
    bestFit: "Fitness",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([headOfSportsScience]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(headOfSportsScience);

  render(<App />);
  await screen.findByText("Head Scientist One");

  fireEvent.click(rowFor("Head Scientist One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(headOfSportsScience.id, {
    name: headOfSportsScience.name,
    tags: headOfSportsScience.tags,
    attributes: headOfSportsScience.attributes,
  });
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
