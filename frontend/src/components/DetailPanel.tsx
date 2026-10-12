import { ATTRIBUTE_LEVELS, CATEGORIES, HOLY_TRINITY_FIELDS, type StaffMember } from "../types";
import { starString } from "./starString";

interface DetailPanelProps {
  staff: StaffMember | null;
  mode: "empty" | "preview" | "pinned";
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (id: number) => void;
}

function levelLabel(value: number): string {
  return ATTRIBUTE_LEVELS.find((level) => level.value === value)?.label ?? String(value);
}

export function DetailPanel({ staff, mode, onEdit, onDelete }: DetailPanelProps) {
  if (!staff || mode === "empty") {
    return <div>Hover a row to preview — click to pin</div>;
  }

  return (
    <div>
      <span>{mode === "pinned" ? "Pinned" : "Preview"}</span>
      <h3>{staff.name}</h3>
      <div>{staff.tags.join(", ") || "No tags"}</div>
      <dl>
        {HOLY_TRINITY_FIELDS.map((field) => (
          <div key={field}>
            <dt>{field}</dt>
            <dd>{levelLabel(staff.attributes[field])}</dd>
          </div>
        ))}
      </dl>
      <dl>
        {CATEGORIES.map((category) => (
          <div key={category}>
            <dt>{category}</dt>
            <dd>{starString(staff.categories[category])}</dd>
          </div>
        ))}
      </dl>
      {mode === "pinned" && (
        <div>
          <button onClick={() => onEdit?.(staff)}>Edit</button>
          <button
            onClick={() => {
              if (window.confirm(`Delete ${staff.name}? This cannot be undone.`)) {
                onDelete?.(staff.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
