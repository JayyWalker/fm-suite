import styles from "./GradeChip.module.css";

const LABELS: Record<number, string> = {
  1: "Poor",
  2: "Avg",
  3: "Good",
  4: "Strong",
  5: "Elite",
};

const TIER_CLASSES: Record<number, string> = {
  1: styles.s1,
  2: styles.s2,
  3: styles.s3,
  4: styles.s4,
  5: styles.s5,
};

interface GradeChipProps {
  stars: number;
}

export function GradeChip({ stars }: GradeChipProps) {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return <span className={`${styles.chip} ${styles.unknown}`}>—</span>;
  }

  return (
    <span className={`${styles.chip} ${TIER_CLASSES[stars]}`}>
      {stars}★ {LABELS[stars]}
    </span>
  );
}
