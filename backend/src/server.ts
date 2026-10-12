import Fastify, { type FastifyInstance } from "fastify";
import type { Database } from "better-sqlite3";
import { StaffRepository, type StaffRecord } from "./staffRepository";
import { rateStaff } from "./scoring";
import { createStaffSchema, updateStaffSchema, idParamSchema } from "./staffSchemas";

function toResponse(record: StaffRecord) {
  const ratings = rateStaff(record.attributes);
  return {
    id: record.id,
    name: record.name,
    tags: record.tags,
    attributes: record.attributes,
    categories: ratings.categories,
    bestFit: ratings.bestFit,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function buildServer(db: Database): FastifyInstance {
  const app = Fastify({ ajv: { customOptions: { coerceTypes: false } } });
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
    const body = request.body as { name: string; tags?: string[]; attributes: StaffRecord["attributes"] };
    const created = repo.create({ name: body.name, tags: body.tags ?? [], attributes: body.attributes });
    reply.code(201);
    return toResponse(created);
  });

  app.patch("/staff/:id", { schema: updateStaffSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<{ name: string; tags: string[]; attributes: StaffRecord["attributes"] }>;
    const updated = repo.update(Number(id), body);
    if (!updated) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    return toResponse(updated);
  });

  app.delete("/staff/:id", { schema: idParamSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = repo.delete(Number(id));
    if (!deleted) {
      return reply.code(404).send({ error: "Staff member not found" });
    }
    return reply.code(204).send();
  });

  return app;
}
