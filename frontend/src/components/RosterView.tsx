import { useState } from "react";
import type { StaffMember } from "../types";
import { StaffTable } from "./StaffTable";
import { DetailPanel } from "./DetailPanel";
import { HoverTooltip } from "./HoverTooltip";
import styles from "./RosterView.module.css";

interface RosterViewProps {
  staff: StaffMember[];
  onEdit: (staff: StaffMember) => void;
  onDelete: (id: number) => void;
}

export function RosterView({ staff, onEdit, onDelete }: RosterViewProps) {
  const [pinnedId, setPinnedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  function handleRowHover(id: number | null) {
    setHoveredId(id);
    if (id === null) setMousePos(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (pinnedId !== null && hoveredId !== null && hoveredId !== pinnedId) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  }

  function handleRowClick(id: number) {
    setPinnedId(pinnedId === id ? null : id);
  }

  const pinnedStaff = pinnedId !== null ? staff.find((s) => s.id === pinnedId) ?? null : null;
  const hoveredStaff = hoveredId !== null ? staff.find((s) => s.id === hoveredId) ?? null : null;

  const detailStaff = pinnedStaff ?? hoveredStaff;
  const detailMode: "empty" | "preview" | "pinned" = pinnedStaff ? "pinned" : hoveredStaff ? "preview" : "empty";

  const tooltipStaff = pinnedStaff && hoveredStaff && hoveredId !== pinnedId ? hoveredStaff : null;

  return (
    <div className={styles.wrap} onMouseMove={handleMouseMove}>
      <div className={styles.pane}>
        <StaffTable staff={staff} pinnedId={pinnedId} onRowHover={handleRowHover} onRowClick={handleRowClick} />
      </div>
      <div className={styles.pane}>
        <DetailPanel staff={detailStaff} mode={detailMode} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <HoverTooltip staff={tooltipStaff} position={tooltipStaff ? mousePos : null} />
    </div>
  );
}
