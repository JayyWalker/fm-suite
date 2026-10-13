import { expect, test } from "vitest";
import { buildAttributesSchema } from "./buildAttributesSchema";

test("builds a JSON schema whose properties list exactly mirrors the required list", () => {
  const schema = buildAttributesSchema(["foo", "bar", "baz"]);

  expect(schema.required).toEqual(["foo", "bar", "baz"]);
  expect(Object.keys(schema.properties)).toEqual(["foo", "bar", "baz"]);
  expect(schema.type).toBe("object");
  expect(schema.additionalProperties).toBe(false);
});

test("every property uses the same 1-8 integer constraint", () => {
  const schema = buildAttributesSchema(["foo", "bar"]);

  expect(schema.properties.foo).toEqual({ type: "integer", minimum: 1, maximum: 8 });
  expect(schema.properties.bar).toEqual({ type: "integer", minimum: 1, maximum: 8 });
});
