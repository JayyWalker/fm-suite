const attributeSchema = { type: "integer", minimum: 1, maximum: 8 };

export function buildAttributesSchema(required: string[]) {
  return {
    type: "object",
    required,
    properties: Object.fromEntries(required.map((key) => [key, attributeSchema])),
    additionalProperties: false,
  };
}
