import { HOLY_TRINITY_FIELDS, type StaffMember } from "../types";
import { starString } from "./starString";

interface HoverTooltipProps {
  staff: StaffMember | null;
  position: { x: number; y: number } | null;
}

export function HoverTooltip({ staff, position }: HoverTooltipProps) {
  if (!staff || !position) return null;

  return (
    <div style={{ position: "fixed", left: `${position.x}px`, top: `${position.y}px` }}>
      <div>{staff.name}</div>
      {HOLY_TRINITY_FIELDS.map((field) => (
        <div key={field}>
          {field}: {staff.attributes[field]}
        </div>
      ))}
      <div>
        Best fit: {staff.bestFit} {starString(staff.categories[staff.bestFit])}
      </div>
    </div>
  );
}
