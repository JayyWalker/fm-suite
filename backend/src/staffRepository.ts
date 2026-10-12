import type { Database } from "better-sqlite3";
import type { StaffAttributes } from "./scoring";

export interface StaffRecord {
  id: number;
  name: string;
  tags: string[];
  attributes: StaffAttributes;
  createdAt: string;
  updatedAt: string;
}

export interface StaffInput {
  name: string;
  tags: string[];
  attributes: StaffAttributes;
}

interface StaffRow {
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

function rowToRecord(row: StaffRow): StaffRecord {
  return {
    id: row.id,
    name: row.name,
    tags: JSON.parse(row.tags),
    attributes: {
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
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class StaffRepository {
  constructor(private db: Database) {}

  create(input: StaffInput): StaffRecord {
    const now = new Date().toISOString();
    const a = input.attributes;
    const result = this.db
      .prepare(
        `INSERT INTO staff (
          name, tags, authority, determination, motivating, attacking,
          defending, fitness, goalkeeping, possession, set_pieces,
          tactical, technical, tactical_knowledge, created_at, updated_at
        ) VALUES (@name, @tags, @authority, @determination, @motivating, @attacking,
          @defending, @fitness, @goalkeeping, @possession, @setPieces,
          @tactical, @technical, @tacticalKnowledge, @createdAt, @updatedAt)`
      )
      .run({
        name: input.name,
        tags: JSON.stringify(input.tags),
        authority: a.authority,
        determination: a.determination,
        motivating: a.motivating,
        attacking: a.attacking,
        defending: a.defending,
        fitness: a.fitness,
        goalkeeping: a.goalkeeping,
        possession: a.possession,
        setPieces: a.setPieces,
        tactical: a.tactical,
        technical: a.technical,
        tacticalKnowledge: a.tacticalKnowledge,
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

  update(id: number, patch: Partial<StaffInput>): StaffRecord | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const merged: StaffInput = {
      name: patch.name ?? existing.name,
      tags: patch.tags ?? existing.tags,
      attributes: { ...existing.attributes, ...patch.attributes },
    };
    const now = new Date().toISOString();
    const a = merged.attributes;

    this.db
      .prepare(
        `UPDATE staff SET
          name = @name, tags = @tags, authority = @authority,
          determination = @determination, motivating = @motivating,
          attacking = @attacking, defending = @defending, fitness = @fitness,
          goalkeeping = @goalkeeping, possession = @possession,
          set_pieces = @setPieces, tactical = @tactical, technical = @technical,
          tactical_knowledge = @tacticalKnowledge, updated_at = @updatedAt
        WHERE id = @id`
      )
      .run({
        id,
        name: merged.name,
        tags: JSON.stringify(merged.tags),
        authority: a.authority,
        determination: a.determination,
        motivating: a.motivating,
        attacking: a.attacking,
        defending: a.defending,
        fitness: a.fitness,
        goalkeeping: a.goalkeeping,
        possession: a.possession,
        setPieces: a.setPieces,
        tactical: a.tactical,
        technical: a.technical,
        tacticalKnowledge: a.tacticalKnowledge,
        updatedAt: now,
      });

    return this.getById(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare("DELETE FROM staff WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
