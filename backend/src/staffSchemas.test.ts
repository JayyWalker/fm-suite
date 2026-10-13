import { expect, test } from "vitest";
import { createStaffSchema } from "./staffSchemas";
import { STAFF_ROLES } from "./roles/index";

test("role enum matches the registered roles", () => {
  expect(createStaffSchema.body.properties.role.enum).toEqual(STAFF_ROLES);
});
