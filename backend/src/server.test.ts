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

function physioAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    physiotherapy: 5,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function hoydAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    workingWithYoungsters: 5,
    jpa: 4,
    jpp: 4,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function dofAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    negotiating: 5,
    jpa: 4,
    jpp: 4,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function dataAnalystAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    judgingPlayerData: 5,
    judgingTeamData: 4,
    presentingData: 4,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function sportsScienceAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    fitness: 5,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function headPhysioAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    physiotherapy: 5,
    judgingPlayerCondition: 4,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function setPieceCoachAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    setPieces: 5,
    determination: 4,
    authority: 3,
    motivating: 4,
    ...overrides,
  };
}

function performanceAnalystAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    analysingData: 5,
    jpa: 4,
    tacticalKnowledge: 4,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function recruitmentAnalystAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    analysingData: 5,
    jpa: 4,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
    ...overrides,
  };
}

function technicalDirectorAttributes(overrides: Partial<Record<string, number>> = {}): Record<string, number> {
  return {
    negotiating: 5,
    judgingStaffAbility: 4,
    determination: 4,
    adaptability: 3,
    manManagement: 4,
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

  test("creates a physio and returns it with its own category", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Jamie Carragher Jr.", role: "physio", attributes: physioAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("physio");
    expect(body.categories.Physiotherapy).toBeGreaterThanOrEqual(1);
    expect(body.bestFit).toBe("Physiotherapy");
  });

  test("creates a head of youth development and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Robbo Taylor", role: "hoyd", attributes: hoydAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("hoyd");
    expect(body.categories["Working with Youngsters"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Current Ability Judging"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Potential Judging"]).toBeGreaterThanOrEqual(1);
  });

  test("creates a director of football and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Dan Ashworth Jr.", role: "dof", attributes: dofAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("dof");
    expect(body.categories["Negotiating"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Current Ability Judging"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Potential Judging"]).toBeGreaterThanOrEqual(1);
  });

  test("creates a data analyst and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Priya Nkemdirim", role: "dataAnalyst", attributes: dataAnalystAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("dataAnalyst");
    expect(body.categories["Judging Player Data"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Judging Team Data"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Presenting Data"]).toBeGreaterThanOrEqual(1);
  });

  test("creates a sports scientist and a head of sports science, each rated via the shared formula", async () => {
    const scientistRes = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Walter Gfrerer Jr.", role: "sportsScientist", attributes: sportsScienceAttributes() },
    });
    const headRes = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Head Scientist", role: "headOfSportsScience", attributes: sportsScienceAttributes() },
    });

    expect(scientistRes.statusCode).toBe(201);
    expect(headRes.statusCode).toBe(201);
    expect(scientistRes.json().role).toBe("sportsScientist");
    expect(headRes.json().role).toBe("headOfSportsScience");
    expect(scientistRes.json().categories.Fitness).toBeGreaterThanOrEqual(1);
    expect(headRes.json().categories.Fitness).toBeGreaterThanOrEqual(1);
  });

  test("creates a head physio and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Head Physio One", role: "headPhysio", attributes: headPhysioAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("headPhysio");
    expect(body.categories.Physiotherapy).toBeGreaterThanOrEqual(1);
    expect(body.categories["Judging Player Condition"]).toBeGreaterThanOrEqual(1);
  });

  test("creates a set piece coach and returns it with its own category", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Set Piece Coach One", role: "setPieceCoach", attributes: setPieceCoachAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("setPieceCoach");
    expect(body.categories["Set Pieces"]).toBeGreaterThanOrEqual(1);
    expect(body.bestFit).toBe("Set Pieces");
  });

  test("creates a performance analyst and a head performance analyst, each rated via the shared formula", async () => {
    const analystRes = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Performance Analyst One", role: "performanceAnalyst", attributes: performanceAnalystAttributes() },
    });
    const headRes = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Head Performance Analyst One", role: "headPerformanceAnalyst", attributes: performanceAnalystAttributes() },
    });

    expect(analystRes.statusCode).toBe(201);
    expect(headRes.statusCode).toBe(201);
    expect(analystRes.json().role).toBe("performanceAnalyst");
    expect(headRes.json().role).toBe("headPerformanceAnalyst");
    expect(analystRes.json().categories["Analysing Data"]).toBeGreaterThanOrEqual(1);
    expect(headRes.json().categories["Analysing Data"]).toBeGreaterThanOrEqual(1);
  });

  test("creates a recruitment analyst and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Recruitment Analyst One", role: "recruitmentAnalyst", attributes: recruitmentAnalystAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("recruitmentAnalyst");
    expect(body.categories["Analysing Data"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Judging Player Ability"]).toBeGreaterThanOrEqual(1);
  });

  test("creates a technical director and returns it with its own categories", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Technical Director One", role: "technicalDirector", attributes: technicalDirectorAttributes() },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.role).toBe("technicalDirector");
    expect(body.categories["Negotiating"]).toBeGreaterThanOrEqual(1);
    expect(body.categories["Judging Staff Ability"]).toBeGreaterThanOrEqual(1);
  });

  test("rejects an unrecognized role with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      payload: { name: "Bad Role", role: "not-a-real-role", attributes: coachAttributes() },
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
