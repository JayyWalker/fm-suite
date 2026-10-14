import { describe, expect, test } from "vitest";
import { createStaffSchema, validateAttributes } from "./staffSchemas";
import { STAFF_ROLES } from "./roles/index";
import { scoutAttributesSchema } from "./roles/scout";

test("role enum matches the registered roles", () => {
  expect(createStaffSchema.body.properties.role.enum).toEqual(STAFF_ROLES);
});

describe("validateAttributes with an array-shaped field (Scout's nationKnowledge)", () => {
  const validBase = { jpa: 4, jpp: 4, determination: 4, adaptability: 4 };

  test("accepts a scout with an empty nationKnowledge list", () => {
    expect(validateAttributes(scoutAttributesSchema, { ...validBase, nationKnowledge: [] })).toBe(true);
  });

  test("accepts a scout with valid nation entries", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "England", tier: 7 }, { nation: "Brazil", tier: 3 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(true);
  });

  test("accepts a nation not present in any canonical list (free text is allowed)", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "Atlantis", tier: 1 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(true);
  });

  test("rejects a nationKnowledge entry missing a nation", () => {
    const attrs = { ...validBase, nationKnowledge: [{ tier: 3 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("rejects a nationKnowledge entry with tier above 7", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "France", tier: 8 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("rejects a nationKnowledge entry with a non-integer tier", () => {
    const attrs = { ...validBase, nationKnowledge: [{ nation: "France", tier: 3.5 }] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("rejects nationKnowledge that isn't an array", () => {
    const attrs = { ...validBase, nationKnowledge: "England" };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });

  test("still rejects an out-of-range integer attribute (jpa above 8)", () => {
    const attrs = { ...validBase, jpa: 9, nationKnowledge: [] };
    expect(validateAttributes(scoutAttributesSchema, attrs)).toBe(false);
  });
});
