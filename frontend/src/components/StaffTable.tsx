import { useState } from "react";
import { CATEGORIES, type StaffMember } from "../types";
import { sortStaff, type SortKey } from "./sortStaff";
import { starString } from "./starString";

interface StaffTableProps {
  staff: StaffMember[];
  pinnedId: number | null;
  onRowHover: (id: number | null) => void;
  onRowClick: (id: number) => void;
}

export function StaffTable({ staff, pinnedId, onRowHover, onRowClick }: StaffTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  function handleCategorySort(category: string) {
    setSortKey(category as SortKey);
    setDirection("desc");
  }

  const sorted = sortStaff(staff, sortKey, direction);

  return (
    <div>
      <label>
        Sort by category
        <select aria-label="Sort by category" value="" onChange={(e) => handleCategorySort(e.target.value)}>
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <table>
        <thead>
          <tr>
            <th onClick={() => toggleSort("name")}>Name</th>
            <th>Tags</th>
            <th onClick={() => toggleSort("bestFit")}>Best fit</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((member) => (
            <tr
              key={member.id}
              onMouseOver={() => onRowHover(member.id)}
              onMouseOut={() => onRowHover(null)}
              onClick={() => onRowClick(member.id)}
              style={pinnedId === member.id ? { fontWeight: "bold" } : undefined}
            >
              <td>{member.name}</td>
              <td>{member.tags.join(", ") || "—"}</td>
              <td>
                {member.bestFit} {starString(member.categories[member.bestFit])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
