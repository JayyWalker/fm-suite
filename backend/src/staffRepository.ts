import type { Database } from "better-sqlite3";
import type { StaffRole } from "./roles/index";

export interface StaffRecord {
  id: number;
  name: string;
  role: StaffRole;
  tags: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInput {
  name: string;
  role: StaffRole;
  tags: string[];
  attributes: Record<string, unknown>;
}

interface StaffRow {
  id: number;
  name: string;
  role: string;
  tags: string;
  attributes: string;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: StaffRow): StaffRecord {
  return {
    id: row.id,
    name: row.name,
    role: row.role as StaffRole,
    tags: JSON.parse(row.tags),
    attributes: JSON.parse(row.attributes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class StaffRepository {
  constructor(private db: Database) {}

  create(input: StaffInput): StaffRecord {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO staff (name, role, tags, attributes, created_at, updated_at)
         VALUES (@name, @role, @tags, @attributes, @createdAt, @updatedAt)`
      )
      .run({
        name: input.name,
        role: input.role,
        tags: JSON.stringify(input.tags),
        attributes: JSON.stringify(input.attributes),
        createdAt: now,
        updatedAt: now,
      });

    return this.getById(result.lastInsertRowid as number)!;
  }

  getById(id: number): StaffRecord | undefined {
    const row = this.db.prepare("SELECT * FROM staff WHERE id = ?").get(id) as StaffRow | undefined;
    return row ? rowToRecord(row) : undefined;
  }

  list(): StaffRecord[] {
    const rows = this.db.prepare("SELECT * FROM staff ORDER BY id").all() as StaffRow[];
    return rows.map(rowToRecord);
  }

  update(id: number, patch: Partial<Pick<StaffInput, "name" | "tags" | "role" | "attributes">>): StaffRecord | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const merged = {
      name: patch.name ?? existing.name,
      role: patch.role ?? existing.role,
      tags: patch.tags ?? existing.tags,
      attributes: patch.attributes ?? existing.attributes,
    };
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE staff SET name = @name, role = @role, tags = @tags, attributes = @attributes, updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id,
        name: merged.name,
        role: merged.role,
        tags: JSON.stringify(merged.tags),
        attributes: JSON.stringify(merged.attributes),
        updatedAt: now,
      });

    return this.getById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare("DELETE FROM staff WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
