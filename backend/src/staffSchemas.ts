const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export const staffAttributesSchema = {
  type: "object",
  required: [
    "authority",
    "determination",
    "motivating",
    "attacking",
    "defending",
    "fitness",
    "goalkeeping",
    "possession",
    "setPieces",
    "tactical",
    "technical",
    "tacticalKnowledge",
  ],
  properties: {
    authority: attributeSchema,
    determination: attributeSchema,
    motivating: attributeSchema,
    attacking: attributeSchema,
    defending: attributeSchema,
    fitness: attributeSchema,
    goalkeeping: attributeSchema,
    possession: attributeSchema,
    setPieces: attributeSchema,
    tactical: attributeSchema,
    technical: attributeSchema,
    tacticalKnowledge: attributeSchema,
  },
  additionalProperties: false,
};

export const createStaffSchema = {
  body: {
    type: "object",
    required: ["name", "attributes"],
    properties: {
      name: { type: "string", minLength: 1 },
      tags: { type: "array", items: { type: "string" }, default: [] },
      attributes: staffAttributesSchema,
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
      attributes: staffAttributesSchema,
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
