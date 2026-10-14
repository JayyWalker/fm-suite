import { render, screen, fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { NationKnowledgeEditor } from "./NationKnowledgeEditor";

test("renders one row per entry with nation and tier values", () => {
  render(
    <NationKnowledgeEditor
      entries={[{ nation: "England", tier: 7 }, { nation: "Brazil", tier: 3 }]}
      onChange={vi.fn()}
    />,
  );

  expect(screen.getByLabelText("Nation 1")).toHaveValue("England");
  expect(screen.getByLabelText("Knowledge 1")).toHaveValue("7");
  expect(screen.getByLabelText("Nation 2")).toHaveValue("Brazil");
  expect(screen.getByLabelText("Knowledge 2")).toHaveValue("3");
});

test("adding a row calls onChange with an extra entry appended", () => {
  const onChange = vi.fn();
  render(<NationKnowledgeEditor entries={[]} onChange={onChange} />);

  fireEvent.click(screen.getByRole("button", { name: "Add nation" }));

  expect(onChange).toHaveBeenCalledWith([{ nation: "Afghanistan", tier: 1 }]);
});

test("removing a row calls onChange without that entry", () => {
  const onChange = vi.fn();
  render(
    <NationKnowledgeEditor
      entries={[{ nation: "England", tier: 7 }, { nation: "Brazil", tier: 3 }]}
      onChange={onChange}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Remove nation 1" }));

  expect(onChange).toHaveBeenCalledWith([{ nation: "Brazil", tier: 3 }]);
});

test("changing a row's tier calls onChange with that entry updated", () => {
  const onChange = vi.fn();
  render(<NationKnowledgeEditor entries={[{ nation: "England", tier: 7 }]} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Knowledge 1"), { target: { value: "2" } });

  expect(onChange).toHaveBeenCalledWith([{ nation: "England", tier: 2 }]);
});

test("changing a row's nation calls onChange with that entry updated", () => {
  const onChange = vi.fn();
  render(<NationKnowledgeEditor entries={[{ nation: "England", tier: 7 }]} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Nation 1"), { target: { value: "Wales" } });

  expect(onChange).toHaveBeenCalledWith([{ nation: "Wales", tier: 7 }]);
});
