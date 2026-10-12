import { beforeEach, describe, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { createDb } from "./db";
import { buildServer } from "./server";

function coachAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    authority: 3,
    determination: 4,
    motivating: 5,
    attacking: 6,
    defending: 2,
    fitness: 3,
    goalkeeping: 1,
    possession: 4,
    setPieces: 3,
    tactical: 6,
    technical: 5,
    tacticalKnowledge: 6,
    ...overrides,
  };
}

function scoutAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    jpa: 5,
    jpp: 4,
    determination: 4,
    adaptability: 3,
    westernEurope: 1,
    centralEurope: 1,
    ukAndIreland: 1,
    southernEurope: 1,
    southEasternEurope: 1,
    northEasternEurope: 1,
    northernEurope: 1,
    easternEurope: 1,
    southAmericaNorth: 1,
    southAmericaSouth: 1,
    northAmerica: 1,
    westernAfrica: 1,
    centralAfrica: 1,
    southernAfrica: 1,
    northAfrica: 1,
    middleEast: 1,
    eastAsia: 1,
    southEastAsia: 1,
    oceania: 1,
    ...overrides,
  };
}

let app: FastifyInstance;

beforeEach(() => {
  app = buildServer(createDb(":memory:"));
});

describe("POST /staff", () => {
  test("creates a coach and returns it with computed ratings", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Carlo Rossi", role: "coach", tags: ["Shortlist"], attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("coach");
    expect(body.tags).toEqual(["Shortlist"]);
    expect(body.categories.Attacking).toBeGreaterThanOrEqual(1);
    expect(body.bestFit).toBeDefined();
  });

  test("creates a scout and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Ana Dimitriou", role: "scout", attributes: scoutAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("scout");
    expect(body.categories["Current Ability Judging"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Potential Judging"]).toBeGreaterThanOrEqual(1);
  });

  test("defaults tags to an empty array when omitted", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "No Tags", role: "coach", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().tags).toEqual([]);
  });

  test("rejects an unrecognized role with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Role", role: "physio", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a coach-shaped attributes object when role is scout", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Mismatched", role: "scout", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects an attribute value above 8 with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Attrs", role: "coach", attributes: coachAttributes({ attacking: 9 }) },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects an attribute value of 0 with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Attrs", role: "coach", attributes: coachAttributes({ attacking: 0 }) },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a non-integer attribute value with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Attrs", role: "coach", attributes: coachAttributes({ attacking: 6.5 }) },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a boolean attribute value with a 400 instead of coercing it to 1", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Attrs", role: "coach", attributes: coachAttributes({ attacking: true as unknown as number }) },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a non-array tags value with a 400 instead of coercing it", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Tags", role: "coach", tags: "Shortlist" as unknown as string[], attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });

  test("rejects a missing name with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { role: "coach", attributes: coachAttributes() },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /staff", () => {
  test("lists all created staff regardless of role", async () => {
    await app.inject({ method: "POST", url: "/staff", payload: { name: "A", role: "coach", attributes: coachAttributes() } });
    await app.inject({ method: "POST", url: "/staff", payload: { name: "B", role: "scout", attributes: scoutAttributes() } });

    const res = await app.inject({ method: "GET", url: "/staff" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(2);
  });
});

describe("GET /staff/:id", () => {
  test("returns 404 for a non-existent id", async () => {
    const res = await app.inject({ method: "GET", url: "/staff/999999" });
    expect(res.statusCode).toBe(404);
  });
});

describe("PATCH /staff/:id", () => {
  test("updates an existing staff member", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Before", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { name: "After" } });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("After");
  });

  test("rejects a role in the PATCH body with a 400 instead of changing it", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Fixed Role", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { role: "scout" } });

    expect(res.statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: `/staff/${id}` })).json().role).toBe("coach");
  });

  test("validates a patched attributes object against the existing record's own role", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Coach", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "PATCH", url: `/staff/${id}`, payload: { attributes: scoutAttributes() } });

    expect(res.statusCode).toBe(400);
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await app.inject({ method: "PATCH", url: "/staff/999999", payload: { name: "Nope" } });
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /staff/:id", () => {
  test("deletes an existing staff member", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "ToDelete", role: "coach", attributes: coachAttributes() },
    });
    const id = created.json().id;

    const res = await app.inject({ method: "DELETE", url: `/staff/${id}` });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: "GET", url: `/staff/${id}` });
    expect(getRes.statusCode).toBe(404);
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await app.inject({ method: "DELETE", url: "/staff/999999" });
    expect(res.statusCode).toBe(404);
  });
});
