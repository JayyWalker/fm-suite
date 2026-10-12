import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { GradeChip } from "./GradeChip";

test.each([
  [1, "Poor"],
  [2, "Avg"],
  [3, "Good"],
  [4, "Strong"],
  [5, "Elite"],
])("renders %i star as '%i★ %s'", (stars, label) => {
  render(<GradeChip stars={stars} />);
  expect(screen.getByText(`${stars}★ ${label}`)).toBeInTheDocument();
});

test("applies a distinct class per star rating so each tier can be colored differently", () => {
  render(<GradeChip stars={5} />);
  const chip = screen.getByText("5★ Elite");
  const classesFor5 = chip.className;

  render(<GradeChip stars={1} />);
  const otherChip = screen.getByText("1★ Poor");

  expect(otherChip.className).not.toBe(classesFor5);
});
