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

test("editing a physio and saving sends its own attributes and includes its role", async () => {
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
    role: physio.role,
    name: physio.name,
    tags: physio.tags,
    attributes: physio.attributes,
  });
});

test("editing a HoYD and saving sends its own attributes and includes its role", async () => {
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
    role: hoyd.role,
    name: hoyd.name,
    tags: hoyd.tags,
    attributes: hoyd.attributes,
  });
});

test("editing a DoF and saving sends its own attributes and includes its role", async () => {
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
    role: dof.role,
    name: dof.name,
    tags: dof.tags,
    attributes: dof.attributes,
  });
});

test("editing a Data Analyst and saving sends its own attributes and includes its role", async () => {
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
    role: dataAnalyst.role,
    name: dataAnalyst.name,
    tags: dataAnalyst.tags,
    attributes: dataAnalyst.attributes,
  });
});

test("editing a Sports Scientist and saving sends its own attributes and includes its role", async () => {
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
    role: sportsScientist.role,
    name: sportsScientist.name,
    tags: sportsScientist.tags,
    attributes: sportsScientist.attributes,
  });
});

test("editing a Head of Sports Science and saving sends its own attributes and includes its role", async () => {
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
    role: headOfSportsScience.role,
    name: headOfSportsScience.name,
    tags: headOfSportsScience.tags,
    attributes: headOfSportsScience.attributes,
  });
});

test("editing a Head Physio and saving sends its own attributes and includes its role", async () => {
  const headPhysio = member({
    id: 10,
    name: "Head Physio One",
    role: "headPhysio",
    attributes: { physiotherapy: 5, judgingPlayerCondition: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { Physiotherapy: 4, "Judging Player Condition": 3 },
    bestFit: "Physiotherapy",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([headPhysio]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(headPhysio);

  render(<App />);
  await screen.findByText("Head Physio One");

  fireEvent.click(rowFor("Head Physio One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(headPhysio.id, {
    role: headPhysio.role,
    name: headPhysio.name,
    tags: headPhysio.tags,
    attributes: headPhysio.attributes,
  });
});

test("editing a Set Piece Coach and saving sends its own attributes and includes its role", async () => {
  const setPieceCoach = member({
    id: 11,
    name: "Set Piece Coach One",
    role: "setPieceCoach",
    attributes: { setPieces: 5, determination: 4, authority: 4, motivating: 4 } as never,
    categories: { "Set Pieces": 4 },
    bestFit: "Set Pieces",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([setPieceCoach]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(setPieceCoach);

  render(<App />);
  await screen.findByText("Set Piece Coach One");

  fireEvent.click(rowFor("Set Piece Coach One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(setPieceCoach.id, {
    role: setPieceCoach.role,
    name: setPieceCoach.name,
    tags: setPieceCoach.tags,
    attributes: setPieceCoach.attributes,
  });
});

test("editing a Performance Analyst and saving sends its own attributes and includes its role", async () => {
  const performanceAnalyst = member({
    id: 12,
    name: "Performance Analyst One",
    role: "performanceAnalyst",
    attributes: { analysingData: 5, jpa: 4, tacticalKnowledge: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { "Analysing Data": 4, "Judging Player Ability": 3, "Tactical Knowledge": 3 },
    bestFit: "Analysing Data",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([performanceAnalyst]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(performanceAnalyst);

  render(<App />);
  await screen.findByText("Performance Analyst One");

  fireEvent.click(rowFor("Performance Analyst One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(performanceAnalyst.id, {
    role: performanceAnalyst.role,
    name: performanceAnalyst.name,
    tags: performanceAnalyst.tags,
    attributes: performanceAnalyst.attributes,
  });
});

test("editing a Head Performance Analyst and saving sends its own attributes and includes its role", async () => {
  const headPerformanceAnalyst = member({
    id: 13,
    name: "Head Performance Analyst One",
    role: "headPerformanceAnalyst",
    attributes: { analysingData: 5, jpa: 4, tacticalKnowledge: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { "Analysing Data": 4, "Judging Player Ability": 3, "Tactical Knowledge": 3 },
    bestFit: "Analysing Data",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([headPerformanceAnalyst]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(headPerformanceAnalyst);

  render(<App />);
  await screen.findByText("Head Performance Analyst One");

  fireEvent.click(rowFor("Head Performance Analyst One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(headPerformanceAnalyst.id, {
    role: headPerformanceAnalyst.role,
    name: headPerformanceAnalyst.name,
    tags: headPerformanceAnalyst.tags,
    attributes: headPerformanceAnalyst.attributes,
  });
});

test("editing a Recruitment Analyst and saving sends its own attributes and includes its role", async () => {
  const recruitmentAnalyst = member({
    id: 14,
    name: "Recruitment Analyst One",
    role: "recruitmentAnalyst",
    attributes: { analysingData: 5, jpa: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { "Analysing Data": 4, "Judging Player Ability": 3 },
    bestFit: "Analysing Data",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([recruitmentAnalyst]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(recruitmentAnalyst);

  render(<App />);
  await screen.findByText("Recruitment Analyst One");

  fireEvent.click(rowFor("Recruitment Analyst One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(recruitmentAnalyst.id, {
    role: recruitmentAnalyst.role,
    name: recruitmentAnalyst.name,
    tags: recruitmentAnalyst.tags,
    attributes: recruitmentAnalyst.attributes,
  });
});

test("editing a Technical Director and saving sends its own attributes and includes its role", async () => {
  const technicalDirector = member({
    id: 15,
    name: "Technical Director One",
    role: "technicalDirector",
    attributes: { negotiating: 5, judgingStaffAbility: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { Negotiating: 4, "Judging Staff Ability": 3 },
    bestFit: "Negotiating",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([technicalDirector]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(technicalDirector);

  render(<App />);
  await screen.findByText("Technical Director One");

  fireEvent.click(rowFor("Technical Director One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(technicalDirector.id, {
    role: technicalDirector.role,
    name: technicalDirector.name,
    tags: technicalDirector.tags,
    attributes: technicalDirector.attributes,
  });
});

test("editing a Loan Manager and saving sends its own attributes and includes its role", async () => {
  const loanManager = member({
    id: 16,
    name: "Loan Manager One",
    role: "loanManager",
    attributes: { analysingData: 5, jpa: 4, jpp: 4, determination: 4, adaptability: 4, manManagement: 4 } as never,
    categories: { "Analysing Data": 4, "Judging Player Ability": 3, "Judging Player Potential": 3 },
    bestFit: "Analysing Data",
  });
  vi.mocked(staffApi.listStaff).mockResolvedValue([loanManager]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(loanManager);

  render(<App />);
  await screen.findByText("Loan Manager One");

  fireEvent.click(rowFor("Loan Manager One"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  expect(staffApi.updateStaff).toHaveBeenCalledWith(loanManager.id, {
    role: loanManager.role,
    name: loanManager.name,
    tags: loanManager.tags,
    attributes: loanManager.attributes,
  });
});

test("switching a coach to physio via the role dropdown and saving sends the new role with reset attributes", async () => {
  const coach = member({ id: 7, name: "Switch Me", role: "coach" });
  const afterSwitch = member({ id: 7, name: "Switch Me", role: "physio" });
  vi.mocked(staffApi.listStaff).mockResolvedValue([coach]);
  vi.mocked(staffApi.updateStaff).mockResolvedValue(afterSwitch);

  render(<App />);
  await screen.findByText("Switch Me");

  fireEvent.click(rowFor("Switch Me"));
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.change(screen.getByLabelText("Role"), { target: { value: "physio" } });
  fireEvent.click(screen.getByText("Save"));

  await waitFor(() => expect(staffApi.updateStaff).toHaveBeenCalledTimes(1));
  const [, patch] = vi.mocked(staffApi.updateStaff).mock.calls[0];
  expect(patch.role).toBe("physio");
  expect(patch.attributes).toEqual(expect.objectContaining({ physiotherapy: 4 }));
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
    role: coachB.role,
    name: coachB.name,
    tags: coachB.tags,
    attributes: coachB.attributes,
  });
});
