import { expect, test } from "vitest";
import { STAFF_ROLES } from "./index";

test("exactly coach and scout are registered as staff roles", () => {
  expect(STAFF_ROLES).toEqual(["coach", "scout"]);
});
