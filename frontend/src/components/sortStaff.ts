import type { Category, StaffMember } from "../types";

export type SortKey = "name" | "bestFit" | Category;

function compare(a: StaffMember, b: StaffMember, sortKey: SortKey): number {
  if (sortKey === "name") return a.name.localeCompare(b.name);
  if (sortKey === "bestFit") return a.categories[a.bestFit] - b.categories[b.bestFit];
  return a.categories[sortKey] - b.categories[sortKey];
}

export function sortStaff(staff: StaffMember[], sortKey: SortKey, direction: "asc" | "desc"): StaffMember[] {
  const sorted = [...staff].sort((a, b) => compare(a, b, sortKey));
  return direction === "desc" ? sorted.reverse() : sorted;
}
