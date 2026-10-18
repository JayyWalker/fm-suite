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
      role: { type: "string", enum: STAFF_ROLES },
      attributes: { type: "object" },
    },
    additionalProperties: false,
  },
};

export const parseScreenshotSchema = {
  body: {
    type: "object",
    required: ["role", "imageBase64"],
    properties: {
      role: { type: "string", enum: STAFF_ROLES },
      panel: { type: "string", enum: ["attributes", "nationKnowledge"] },
      imageBase64: { type: "string", minLength: 1 },
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

interface IntegerProperty {
  type: "integer";
  minimum: number;
  maximum: number;
}

interface NationKnowledgeArrayProperty {
  type: "array";
  items: {
    type: "object";
    required: string[];
    properties: {
      nation: { type: "string"; minLength: number };
      tier: { type: "integer"; minimum: number; maximum: number };
    };
    additionalProperties: false;
  };
}

type AttributeProperty = IntegerProperty | NationKnowledgeArrayProperty;

interface AttributesSchema {
  required: string[];
  properties: Record<string, AttributeProperty>;
}

export function validateAttributes(schema: object, value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const { required, properties } = schema as AttributesSchema;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== required.length) return false;
  return required.every((key) => validateProperty(properties[key], obj[key]));
}

function validateProperty(property: AttributeProperty, v: unknown): boolean {
  if (property.type === "integer") {
    return typeof v === "number" && Number.isInteger(v) && v >= property.minimum && v <= property.maximum;
  }
  if (!Array.isArray(v)) return false;
  return v.every((item) => validateArrayItem(property.items, item));
}

function validateArrayItem(itemSchema: NationKnowledgeArrayProperty["items"], item: unknown): boolean {
  if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
  const obj = item as Record<string, unknown>;
  if (Object.keys(obj).length !== itemSchema.required.length) return false;
  return itemSchema.required.every((key) => {
    const propSchema = itemSchema.properties[key as keyof typeof itemSchema.properties];
    const v = obj[key];
    if (propSchema.type === "string") return typeof v === "string" && v.length >= propSchema.minLength;
    return typeof v === "number" && Number.isInteger(v) && v >= propSchema.minimum && v <= propSchema.maximum;
  });
}
