import { HOLY_TRINITY_FIELDS, type StaffMember } from "../types";
import { GradeChip } from "./GradeChip";
import { rawAttributeToStars } from "./starRating";
import styles from "./HoverTooltip.module.css";

interface HoverTooltipProps {
  staff: StaffMember | null;
  position: { x: number; y: number } | null;
}

export function HoverTooltip({ staff, position }: HoverTooltipProps) {
  if (!staff || !position) return null;

  return (
    <div
      className={styles.tooltip}
      style={{ position: "fixed", left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className={styles.name}>{staff.name}</div>
      {HOLY_TRINITY_FIELDS.map((field) => (
        <div key={field} className={styles.row}>
          <span>{field}</span>
          <GradeChip stars={rawAttributeToStars(staff.attributes[field])} />
        </div>
      ))}
      <div className={styles.bestFit}>
        <span>Best fit: {staff.bestFit}</span>
        <GradeChip stars={staff.categories[staff.bestFit]} />
      </div>
    </div>
  );
}
