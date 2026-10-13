import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffForm } from "./StaffForm";
import type { StaffInput } from "../types";

const coachInitialValue: StaffInput = {
  role: "coach",
  name: "Existing Coach",
  tags: ["Shortlist"],
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
} as StaffInput;

const scoutInitialValue: StaffInput = {
  role: "scout",
  name: "Existing Scout",
  tags: [],
  attributes: {
    jpa: 4,
    jpp: 4,
    determination: 4,
    adaptability: 4,
    westernEurope: 4,
    centralEurope: 4,
    ukAndIreland: 4,
    southernEurope: 4,
    southEasternEurope: 4,
    northEasternEurope: 4,
    northernEurope: 4,
    easternEurope: 4,
    southAmericaNorth: 4,
    southAmericaSouth: 4,
    northAmerica: 4,
    westernAfrica: 4,
    centralAfrica: 4,
    southernAfrica: 4,
    northAfrica: 4,
    middleEast: 4,
    eastAsia: 4,
    southEastAsia: 4,
    oceania: 4,
  },
} as StaffInput;

test("shows a role picker with no attribute fields until a role is chosen", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  expect(screen.getByRole("button", { name: "Coach" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Scout" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Physio" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Head of Youth Development" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Director of Football" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Data Analyst" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
});

test("picking Physio shows its fields grouped into Identity, Medical ability, and Mental attributes", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Physio" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Physiotherapy")).toBeInTheDocument();
  expect(screen.getByLabelText("Man Management")).toBeInTheDocument();
  expect(screen.getByText("Identity")).toBeInTheDocument();
  expect(screen.getByText("Medical ability")).toBeInTheDocument();
  expect(screen.getByText("Mental attributes")).toBeInTheDocument();
});

test("picking Head of Youth Development shows its fields grouped into Identity, Youth development ability, and Mental attributes", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Head of Youth Development" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Working with Youngsters")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Player Ability")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Player Potential")).toBeInTheDocument();
  expect(screen.getByText("Identity")).toBeInTheDocument();
  expect(screen.getByText("Youth development ability")).toBeInTheDocument();
  expect(screen.getByText("Mental attributes")).toBeInTheDocument();
});

test("picking Director of Football shows its fields grouped into Identity, Football operations, and Mental attributes", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Director of Football" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Negotiating")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Player Ability")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Player Potential")).toBeInTheDocument();
  expect(screen.getByText("Identity")).toBeInTheDocument();
  expect(screen.getByText("Football operations")).toBeInTheDocument();
  expect(screen.getByText("Mental attributes")).toBeInTheDocument();
});

test("picking Data Analyst shows its fields grouped into Identity, Data analysis, and Mental attributes", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Data Analyst" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Player Data")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Team Data")).toBeInTheDocument();
  expect(screen.getByLabelText("Presenting Data")).toBeInTheDocument();
  expect(screen.getByText("Identity")).toBeInTheDocument();
  expect(screen.getByText("Data analysis")).toBeInTheDocument();
  expect(screen.getByText("Mental attributes")).toBeInTheDocument();
});

test("picking Coach shows its fields grouped into Identity, Mental attributes, Coaching attributes, and Knowledge", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Authority")).toBeInTheDocument();
  expect(screen.getByLabelText("Tactical Knowledge")).toBeInTheDocument();
  expect(screen.getByText("Identity")).toBeInTheDocument();
  expect(screen.getByText("Mental attributes")).toBeInTheDocument();
  expect(screen.getByText("Coaching attributes")).toBeInTheDocument();
  expect(screen.getByText("Knowledge")).toBeInTheDocument();
});

test("picking Scout shows its fields grouped into Identity, Judging ability, Mental attributes, and Regional knowledge", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Scout" }));

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Judging Player Ability")).toBeInTheDocument();
  expect(screen.getByLabelText("Western Europe")).toBeInTheDocument();
  expect(screen.getByText("Judging ability")).toBeInTheDocument();
  expect(screen.getByText("Regional knowledge")).toBeInTheDocument();
});

test("editing a coach skips the picker and pre-fills its fields", () => {
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Coach" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveValue("Existing Coach");
  expect(screen.getByLabelText("Tags")).toHaveValue("Shortlist");
});

test("editing a scout skips the picker and pre-fills its fields", () => {
  render(<StaffForm initialValue={scoutInitialValue} onSubmit={vi.fn()} />);

  expect(screen.queryByRole("button", { name: "Scout" })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveValue("Existing Scout");
  expect(screen.getByLabelText("Judging Player Ability")).toBeInTheDocument();
});

test("does not call onSubmit when the name is empty", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
});

test("submits the entered name, tags, role, and attributes", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Carlo Rossi" } });
  fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Shortlist, U18" } });
  fireEvent.change(screen.getByLabelText("Attacking"), { target: { value: "8" } });
  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  const submitted = onSubmit.mock.calls[0][0];
  expect(submitted.role).toBe("coach");
  expect(submitted.name).toBe("Carlo Rossi");
  expect(submitted.tags).toEqual(["Shortlist", "U18"]);
  expect(submitted.attributes.attacking).toBe(8);
});

test("titles the dialog 'Add staff' before a role is chosen, then 'Add coach' after", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  expect(screen.getByText("Add staff")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Coach" }));

  expect(screen.getByText("Add coach")).toBeInTheDocument();
});

test("titles the dialog 'Edit coach' when editing a coach", () => {
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} />);

  expect(screen.getByText("Edit coach")).toBeInTheDocument();
});

test("pressing Escape calls onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.keyDown(document, { key: "Escape" });

  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("clicking the backdrop calls onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  const backdrop = screen.getByRole("dialog").parentElement!;
  fireEvent.click(backdrop);

  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("clicking inside the dialog does not call onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm initialValue={coachInitialValue} onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.click(screen.getByLabelText("Name"));

  expect(onCancel).not.toHaveBeenCalled();
});

test("clicking the close button calls onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.click(screen.getByLabelText("Close"));

  expect(onCancel).toHaveBeenCalledTimes(1);
});
