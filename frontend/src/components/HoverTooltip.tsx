import type { StaffMember } from "../types";
import { ROLES } from "../roles/index";
import { GradeChip } from "./GradeChip";
import { rawAttributeToStars } from "./starRating";
import styles from "./HoverTooltip.module.css";

interface HoverTooltipProps {
  staff: StaffMember | null;
  position: { x: number; y: number } | null;
}

export function HoverTooltip({ staff, position }: HoverTooltipProps) {
  if (!staff || !position) return null;

  const role = ROLES[staff.role];
  const attributes = staff.attributes as unknown as Record<string, number>;

  return (
    <div
      className={styles.tooltip}
      style={{ position: "fixed", left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className={styles.name}>{staff.name}</div>
      {role.mentalFields.map((field) => (
        <div key={field} className={styles.row}>
          <span>{field}</span>
          <GradeChip stars={rawAttributeToStars(attributes[field])} />
        </div>
      ))}
      <div className={styles.bestFit}>
        <span>Best fit: {staff.bestFit}</span>
        <GradeChip stars={staff.categories[staff.bestFit]} />
      </div>
    </div>
  );
}
