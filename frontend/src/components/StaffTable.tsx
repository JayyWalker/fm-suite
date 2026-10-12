import { useState } from "react";
import type { StaffMember } from "../types";
import { ROLES } from "../roles/index";
import { sortStaff, type SortKey } from "./sortStaff";
import { GradeChip } from "./GradeChip";
import styles from "./StaffTable.module.css";

interface StaffTableProps {
  staff: StaffMember[];
  pinnedId: number | null;
  onRowHover: (id: number | null) => void;
  onRowClick: (id: number) => void;
}

export function StaffTable({ staff, pinnedId, onRowHover, onRowClick }: StaffTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeRoles, setActiveRoles] = useState<string[]>([]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  function handleCategorySort(category: string) {
    setSortKey(category);
    setDirection("desc");
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleRole(role: string) {
    setActiveRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  const allTags = Array.from(new Set(staff.flatMap((member) => member.tags))).sort();
  const allRoles = Array.from(new Set(staff.map((member) => member.role))).sort();
  const allCategories = Array.from(new Set(staff.flatMap((member) => Object.keys(member.categories)))).sort();

  const filtered = staff.filter((member) => {
    const matchesTag = activeTags.length === 0 || member.tags.some((tag) => activeTags.includes(tag));
    const matchesRole = activeRoles.length === 0 || activeRoles.includes(member.role);
    return matchesTag && matchesRole;
  });
  const sorted = sortStaff(filtered, sortKey, direction);

  return (
    <div className={styles.wrap}>
      <div role="group" aria-label="Filter by type" className={styles.tagFilter}>
        {allRoles.map((role) => (
          <button
            key={role}
            type="button"
            className={styles.tagButton}
            aria-pressed={activeRoles.includes(role)}
            onClick={() => toggleRole(role)}
          >
            {ROLES[role].label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Filter by tag" className={styles.tagFilter}>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={styles.tagButton}
            aria-pressed={activeTags.includes(tag)}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <label className={styles.sortControl}>
        Sort by category
        <select aria-label="Sort by category" value="" onChange={(e) => handleCategorySort(e.target.value)}>
          <option value="" disabled>
            Choose a category
          </option>
          {allCategories.map((category) => (
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
            <th onClick={() => toggleSort("type")}>Type</th>
            <th>Tags</th>
            <th onClick={() => toggleSort("bestFit")}>Best fit</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((member) => (
            <tr
              key={member.id}
              onMouseEnter={() => onRowHover(member.id)}
              onMouseLeave={() => onRowHover(null)}
              onClick={() => onRowClick(member.id)}
              className={pinnedId === member.id ? styles.pinnedRow : undefined}
            >
              <td>{member.name}</td>
              <td>{ROLES[member.role].label}</td>
              <td>
                {member.tags.length === 0
                  ? "—"
                  : member.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
              </td>
              <td>
                {member.bestFit} <GradeChip stars={member.categories[member.bestFit]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
