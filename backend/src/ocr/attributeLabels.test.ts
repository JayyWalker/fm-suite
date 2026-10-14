import { expect, test } from "vitest";
import { ROLES, STAFF_ROLES } from "../roles/index";
import { ATTRIBUTE_LABELS } from "./attributeLabels";

test("every role has a label entry", () => {
  for (const role of STAFF_ROLES) {
    expect(ATTRIBUTE_LABELS[role]).toBeDefined();
  }
});

test("every role's integer-typed required attribute keys have a label (Scout's nationKnowledge is excluded, it has its own parser)", () => {
  for (const role of STAFF_ROLES) {
    const required = (ROLES[role].attributesSchema as { required: string[] }).required;
    for (const key of required) {
      if (key === "nationKnowledge") continue;
      expect(ATTRIBUTE_LABELS[role]).toHaveProperty(key);
    }
  }
});

test("coach's attacking attribute is labeled Attacking", () => {
  expect(ATTRIBUTE_LABELS.coach.attacking).toBe("Attacking");
});

test("scout's labels cover only jpa, jpp, determination, adaptability", () => {
  expect(Object.keys(ATTRIBUTE_LABELS.scout).sort()).toEqual(["adaptability", "determination", "jpa", "jpp"]);
});
