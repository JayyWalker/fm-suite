import Fastify, { type FastifyInstance } from "fastify";
import type { Database } from "better-sqlite3";
import { StaffRepository, type StaffRecord } from "./staffRepository";
import { ROLES, type StaffRole } from "./roles/index";
import { createStaffSchema, updateStaffSchema, idParamSchema, parseScreenshotSchema, validateAttributes } from "./staffSchemas";
import { preprocessImage } from "./ocr/preprocessImage";
import { runOcr } from "./ocr/runOcr";
import { parseAttributes } from "./ocr/parseAttributes";
import { parseNationKnowledge } from "./ocr/parseNationKnowledge";

function toResponse(record: StaffRecord) {
  const ratings = ROLES[record.role].rate(record.attributes);
  return {
    id: record.id,
    name: record.name,
    role: record.role,
    tags: record.tags,
    attributes: record.attributes,
    categories: ratings.categories,
    bestFit: ratings.bestFit,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function buildServer(db: Database): FastifyInstance {
  const app = Fastify({ ajv: { customOptions: { coerceTypes: false, removeAdditional: false } } });
  const repo = new StaffRepository(db);

  app.get("/staff", async () => {
    return repo.list().map(toResponse);
  });

  app.get("/staff/:id", { schema: idParamSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const record = repo.getById(Number(id));
    if (!record) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    return toResponse(record);
  });

  app.post("/staff", { schema: createStaffSchema }, async (request, reply) => {
    const body = request.body as { name: string; role: string; tags?: string[]; attributes: Record<string, unknown> };
    const roleDefinition = ROLES[body.role as StaffRole];
    if (!roleDefinition) {
      return reply.code(400).send({ error: `Unknown role: ${body.role}` });
    }
    if (!validateAttributes(roleDefinition.attributesSchema, body.attributes)) {
      return reply.code(400).send({ error: `attributes do not match the ${body.role} role's required shape` });
    }
    const created = repo.create({
      name: body.name,
      role: body.role as StaffRole,
      tags: body.tags ?? [],
      attributes: body.attributes,
    });
    reply.code(201);
    return toResponse(created);
  });

  app.patch("/staff/:id", { schema: updateStaffSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = repo.getById(Number(id));
    if (!existing) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    const body = request.body as Partial<{ name: string; tags: string[]; attributes: Record<string, unknown> }>;
    if (body.attributes && !validateAttributes(ROLES[existing.role].attributesSchema, body.attributes)) {
      return reply.code(400).send({ error: `attributes do not match the ${existing.role} role's required shape` });
    }
    const updated = repo.update(Number(id), body);
    return toResponse(updated!);
  });

  app.delete("/staff/:id", { schema: idParamSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = repo.delete(Number(id));
    if (!deleted) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    return reply.code(204).send();
  });

  // Screenshots arrive base64-encoded, which inflates them by a third, so
  // Fastify's 1 MiB default would reject any ordinary full-screen capture
  // before the handler ever ran. Raised for this route only.
  const PARSE_SCREENSHOT_BODY_LIMIT = 20 * 1024 * 1024;

  app.post("/staff/parse-screenshot", { bodyLimit: PARSE_SCREENSHOT_BODY_LIMIT, schema: parseScreenshotSchema }, async (request, reply) => {
    const body = request.body as { role: string; panel?: "attributes" | "nationKnowledge"; imageBase64: string };

    let buffer: Buffer;
    try {
      buffer = Buffer.from(body.imageBase64, "base64");
      if (buffer.length === 0) throw new Error("empty image");
    } catch {
      return reply.code(400).send({ error: "Could not decode image" });
    }

    let processed: Buffer;
    try {
      processed = await preprocessImage(buffer);
    } catch {
      return reply.code(400).send({ error: "Could not process image" });
    }

    const lines = await runOcr(processed);

    if (body.role === "scout" && body.panel === "nationKnowledge") {
      return parseNationKnowledge(lines);
    }
    return parseAttributes(body.role as StaffRole, lines);
  });

  return app;
}
