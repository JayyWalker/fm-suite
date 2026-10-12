import { afterEach, expect, test } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb } from "./db";

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
