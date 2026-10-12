import { Fragment } from "react";
import type { StaffMember } from "../types";
import { ROLES } from "../roles/index";
import { GradeChip } from "./GradeChip";
import { rawAttributeToStars } from "./starRating";
import styles from "./DetailPanel.module.css";

interface DetailPanelProps {
  staff: StaffMember | null;
  mode: "empty" | "preview" | "pinned";
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (id: number) => void;
}

export function DetailPanel({ staff, mode, onEdit, onDelete }: DetailPanelProps) {
  if (!staff || mode === "empty") {
    return <div className={styles.placeholder}>Hover a row to preview — click to pin</div>;
  }

  const role = ROLES[staff.role];
  const attributes = staff.attributes as unknown as Record<string, number>;

  return (
    <div className={styles.panel}>
      <span className={`${styles.mode} ${mode === "pinned" ? styles.pinned : styles.preview}`}>
        {mode === "pinned" ? "Pinned" : "Preview"}
      </span>
      <h3 className={styles.name}>{staff.name}</h3>
      <div className={styles.tags}>{staff.tags.join(", ") || "No tags"}</div>

      <div className={styles.sectionLabel}>Mental attributes</div>
      <dl className={styles.grid}>
        {role.mentalFields.map((field) => (
          <Fragment key={field}>
            <dt>{field}</dt>
            <dd>
              <GradeChip stars={rawAttributeToStars(attributes[field])} />
            </dd>
          </Fragment>
        ))}
      </dl>

      <div className={styles.sectionLabel}>Categories</div>
      <dl className={styles.grid}>
        {role.categories.map((category) => (
          <Fragment key={category}>
            <dt>{category}</dt>
            <dd>
              <GradeChip stars={staff.categories[category]} />
            </dd>
          </Fragment>
        ))}
      </dl>

      {role.extraDisplayGroups.map((group) => (
        <div key={group.title}>
          <div className={styles.sectionLabel}>{group.title}</div>
          <dl className={styles.grid}>
            {group.fields.map((field) => (
              <Fragment key={field.key}>
                <dt>{field.label}</dt>
                <dd>
                  <GradeChip stars={rawAttributeToStars(attributes[field.key])} />
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      ))}

      {mode === "pinned" && (
        <div className={styles.actions}>
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
