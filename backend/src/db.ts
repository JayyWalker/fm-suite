import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

interface OldStaffRow {
  id: number;
  name: string;
  tags: string;
  authority: number;
  determination: number;
  motivating: number;
  attacking: number;
  defending: number;
  fitness: number;
  goalkeeping: number;
  possession: number;
  set_pieces: number;
  tactical: number;
  technical: number;
  tactical_knowledge: number;
  created_at: string;
  updated_at: string;
}

export function migrateIfNeeded(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'staff'`)
    .get();
  if (!tableExists) return;

  const columns = db.prepare(`PRAGMA table_info(staff)`).all() as { name: string }[];
  const isOldShape = columns.some((column) => column.name === "authority");
  if (!isOldShape) return;

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE staff_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        attributes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    const oldRows = db.prepare(`SELECT * FROM staff`).all() as OldStaffRow[];
    const insert = db.prepare(`
      INSERT INTO staff_new (id, name, role, tags, attributes, created_at, updated_at)
      VALUES (@id, @name, 'coach', @tags, @attributes, @createdAt, @updatedAt)
    `);
    for (const row of oldRows) {
      insert.run({
        id: row.id,
        name: row.name,
        tags: row.tags,
        attributes: JSON.stringify({
          authority: row.authority,
          determination: row.determination,
          motivating: row.motivating,
          attacking: row.attacking,
          defending: row.defending,
          fitness: row.fitness,
          goalkeeping: row.goalkeeping,
          possession: row.possession,
          setPieces: row.set_pieces,
          tactical: row.tactical,
          technical: row.technical,
          tacticalKnowledge: row.tactical_knowledge,
        }),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    db.exec(`DROP TABLE staff`);
    db.exec(`ALTER TABLE staff_new RENAME TO staff`);
  });

  migrate();
}

export function createDb(path: string): Database.Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  migrateIfNeeded(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      attributes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  return db;
}
