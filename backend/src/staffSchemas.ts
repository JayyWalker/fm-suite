import { STAFF_ROLES } from "./roles/index";

export const createStaffSchema = {
  body: {
    type: "object",
    required: ["name", "role", "attributes"],
    properties: {
      name: { type: "string", minLength: 1 },
      role: { type: "string", enum: STAFF_ROLES },
      tags: { type: "array", items: { type: "string" }, default: [] },
      attributes: { type: "object" },
    },
    additionalProperties: false,
  },
};

export const updateStaffSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1 },
      tags: { type: "array", items: { type: "string" } },
      attributes: { type: "object" },
    },
    additionalProperties: false,
  },
};

export const idParamSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
};

interface AttributesSchema {
  required: string[];
}

export function validateAttributes(schema: object, value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const { required } = schema as AttributesSchema;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== required.length) return false;
  return required.every((key) => {
    const v = obj[key];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 8;
  });
}
