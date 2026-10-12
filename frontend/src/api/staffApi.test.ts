import { beforeEach, expect, test, vi } from "vitest";
import { listStaff, createStaff, updateStaff, deleteStaff } from "./staffApi";
import type { StaffInput, StaffMember } from "../types";

const sampleStaff: StaffMember = {
  id: 1,
  name: "Test Coach",
  role: "coach",
  tags: [],
  attributes: {
    authority: 5,
    determination: 5,
    motivating: 5,
    attacking: 5,
    defending: 5,
    fitness: 5,
    goalkeeping: 5,
    possession: 5,
    setPieces: 5,
    tactical: 5,
    technical: 5,
    tacticalKnowledge: 5,
  },
  categories: {
    Attacking: 3,
    Defending: 3,
    Fitness: 3,
    Goalkeeping: 3,
    Possession: 3,
    "Set Pieces": 3,
    Tactical: 3,
  },
  bestFit: "Attacking",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

test("listStaff fetches the staff list", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [sampleStaff] }) as unknown as typeof fetch;

  const result = await listStaff();

  expect(result).toEqual([sampleStaff]);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/staff"));
});

test("listStaff requests a relative path by default, so the Vite dev proxy (not cross-origin fetch) reaches the backend", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [sampleStaff] }) as unknown as typeof fetch;

  await listStaff();

  expect(fetch).toHaveBeenCalledWith("/staff");
});

test("listStaff throws when the response is not ok", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

  await expect(listStaff()).rejects.toThrow();
});

test("createStaff posts the input and returns the created staff member", async () => {
  const input: StaffInput = { role: "coach", name: sampleStaff.name, tags: [], attributes: sampleStaff.attributes };
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleStaff }) as unknown as typeof fetch;

  const result = await createStaff(input);

  expect(result).toEqual(sampleStaff);
  const [, options] = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [string, RequestInit];
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body as string)).toEqual(input);
});

test("updateStaff sends a PATCH with the given patch", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => sampleStaff }) as unknown as typeof fetch;

  await updateStaff(1, { name: "Renamed" });

  const [url, options] = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [string, RequestInit];
  expect(url).toContain("/staff/1");
  expect(options.method).toBe("PATCH");
  expect(JSON.parse(options.body as string)).toEqual({ name: "Renamed" });
});

test("deleteStaff sends a DELETE request", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

  await deleteStaff(1);

  const [url, options] = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [string, RequestInit];
  expect(url).toContain("/staff/1");
  expect(options.method).toBe("DELETE");
});
