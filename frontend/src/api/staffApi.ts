import type { StaffInput, StaffMember } from "../types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export interface ParseScreenshotResult {
  matched?: Record<string, number>;
  nationEntries?: { nation: string; tier: number }[];
  unmatched: string[];
  lowConfidence: string[];
}

export async function listStaff(): Promise<StaffMember[]> {
  const res = await fetch(`${BASE_URL}/staff`);
  if (!res.ok) throw new Error(`Failed to list staff: ${res.status}`);
  return res.json();
}

export async function createStaff(input: StaffInput): Promise<StaffMember> {
  const res = await fetch(`${BASE_URL}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to create staff: ${res.status}`);
  return res.json();
}

export async function updateStaff(id: number, patch: Partial<StaffInput>): Promise<StaffMember> {
  const res = await fetch(`${BASE_URL}/staff/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update staff ${id}: ${res.status}`);
  return res.json();
}

export async function deleteStaff(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/staff/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete staff ${id}: ${res.status}`);
}

export async function parseScreenshot(
  role: string,
  imageBase64: string,
  panel?: "attributes" | "nationKnowledge",
): Promise<ParseScreenshotResult> {
  const res = await fetch(`${BASE_URL}/staff/parse-screenshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, panel, imageBase64 }),
  });
  if (!res.ok) throw new Error(`Failed to parse screenshot: ${res.status}`);
  return res.json();
}
