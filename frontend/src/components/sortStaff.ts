import type { StaffMember } from "../types";

export type SortKey = "name" | "bestFit" | "type" | string;

function categoryValue(member: StaffMember, category: string): number {
  return member.categories[category] ?? 0;
}

function compare(a: StaffMember, b: StaffMember, sortKey: SortKey): number {
  if (sortKey === "name") return a.name.localeCompare(b.name);
  if (sortKey === "type") return a.role.localeCompare(b.role);
  if (sortKey === "bestFit") return categoryValue(a, a.bestFit) - categoryValue(b, b.bestFit);
  return categoryValue(a, sortKey) - categoryValue(b, sortKey);
}

export function sortStaff(staff: StaffMember[], sortKey: SortKey, direction: "asc" | "desc"): StaffMember[] {
  const sorted = [...staff].sort((a, b) => compare(a, b, sortKey));
  return direction === "desc" ? sorted.reverse() : sorted;
}
