import { afterEach, expect, test } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createDb, migrateIfNeeded } from "./db";

test("migrateIfNeeded converts the old rigid-column shape into role + attributes JSON", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      authority INTEGER NOT NULL,
      determination INTEGER NOT NULL,
      motivating INTEGER NOT NULL,
      attacking INTEGER NOT NULL,
      defending INTEGER NOT NULL,
      fitness INTEGER NOT NULL,
      goalkeeping INTEGER NOT NULL,
      possession INTEGER NOT NULL,
      set_pieces INTEGER NOT NULL,
      tactical INTEGER NOT NULL,
      technical INTEGER NOT NULL,
      tactical_knowledge INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.prepare(
    `INSERT INTO staff (
      name, tags, authority, determination, motivating, attacking, defending,
      fitness, goalkeeping, possession, set_pieces, tactical, technical,
      tactical_knowledge, created_at, updated_at
    ) VALUES (
      'Carlo Rossi', '["Shortlist"]', 5, 6, 5, 2, 2, 8, 1, 2, 2, 3, 3, 3,
      '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
    )`
  ).run();

  migrateIfNeeded(db);

  const rows = db.prepare("SELECT * FROM staff").all() as Array<Record<string, unknown>>;
  expect(rows).toHaveLength(1);
  expect(rows[0].role).toBe("coach");
  expect(rows[0].name).toBe("Carlo Rossi");
  expect(rows[0].tags).toBe('["Shortlist"]');
  expect(JSON.parse(rows[0].attributes as string)).toEqual({
    authority: 5,
    determination: 6,
    motivating: 5,
    attacking: 2,
    defending: 2,
    fitness: 8,
    goalkeeping: 1,
    possession: 2,
    setPieces: 2,
    tactical: 3,
    technical: 3,
    tacticalKnowledge: 3,
  });
  expect(rows[0].created_at).toBe("2026-01-01T00:00:00.000Z");
  expect(rows[0].updated_at).toBe("2026-01-01T00:00:00.000Z");

  db.close();
});

test("migrateIfNeeded does nothing on a connection with no staff table yet", () => {
  const db = new Database(":memory:");
  expect(() => migrateIfNeeded(db)).not.toThrow();
  db.close();
});

test("migrateIfNeeded does nothing once the table is already in the new shape", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      attributes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.prepare(
    `INSERT INTO staff (name, role, tags, attributes, created_at, updated_at)
     VALUES ('Jurgen Voss', 'coach', '[]', '{}', 'x', 'x')`
  ).run();

  migrateIfNeeded(db);

  expect(db.prepare("SELECT * FROM staff").all()).toHaveLength(1);
  db.close();
});

let tmpDir: string | undefined;

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

test("createDb creates missing parent directories for the database file", () => {
  tmpDir = mkdtempSync(join(tmpdir(), "fm-suite-db-test-"));
  const dbPath = join(tmpDir, "nested", "sub", "staff.sqlite");

  expect(existsSync(dbPath)).toBe(false);

  const db = createDb(dbPath);

  expect(existsSync(dbPath)).toBe(true);
  db.close();
});
