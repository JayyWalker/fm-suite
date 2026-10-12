import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function createDb(path: string): Database.Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
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
  return db;
}
