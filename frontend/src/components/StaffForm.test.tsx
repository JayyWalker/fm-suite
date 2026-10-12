import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StaffForm } from "./StaffForm";
import { ATTRIBUTE_FIELDS } from "../types";

test("renders a name field, a tags field, and all 12 attribute dropdowns", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  expect(screen.getByLabelText("Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Tags")).toBeInTheDocument();
  for (const field of ATTRIBUTE_FIELDS) {
    expect(screen.getByLabelText(field.label)).toBeInTheDocument();
  }
});

test("does not call onSubmit when the name is empty", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
});

test("submits the entered name, tags, and attributes", () => {
  const onSubmit = vi.fn();
  render(<StaffForm onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Carlo Rossi" } });
  fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Shortlist, U18" } });
  fireEvent.change(screen.getByLabelText("Attacking"), { target: { value: "8" } });

  fireEvent.click(screen.getByText("Save"));

  expect(onSubmit).toHaveBeenCalledTimes(1);
  const submitted = onSubmit.mock.calls[0][0];
  expect(submitted.name).toBe("Carlo Rossi");
  expect(submitted.tags).toEqual(["Shortlist", "U18"]);
  expect(submitted.attributes.attacking).toBe(8);
});

test("pre-fills fields from initialValue when editing", () => {
  render(
    <StaffForm
      initialValue={{
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
      }}
      onSubmit={vi.fn()}
    />
  );

  expect(screen.getByLabelText("Name")).toHaveValue("Existing Coach");
  expect(screen.getByLabelText("Tags")).toHaveValue("Shortlist");
});

test("renders as a modal dialog titled 'Add staff' when creating", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(screen.getByText("Add staff")).toBeInTheDocument();
});

test("titles the dialog 'Edit staff' when editing", () => {
  render(
    <StaffForm
      initialValue={{
        name: "Existing Coach",
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
      }}
      onSubmit={vi.fn()}
    />
  );

  expect(screen.getByText("Edit staff")).toBeInTheDocument();
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
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.click(screen.getByLabelText("Name"));

  expect(onCancel).not.toHaveBeenCalled();
});

test("clicking the close button calls onCancel", () => {
  const onCancel = vi.fn();
  render(<StaffForm onSubmit={vi.fn()} onCancel={onCancel} />);

  fireEvent.click(screen.getByLabelText("Close"));

  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("fields are grouped into Identity, Mental attributes, Coaching attributes, and Knowledge sections", () => {
  render(<StaffForm onSubmit={vi.fn()} />);

  expect(screen.getByText("Identity")).toBeInTheDocument();
  expect(screen.getByText("Mental attributes")).toBeInTheDocument();
  expect(screen.getByText("Coaching attributes")).toBeInTheDocument();
  expect(screen.getByText("Knowledge")).toBeInTheDocument();
});
