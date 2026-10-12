import { useState } from "react";
import { ATTRIBUTE_FIELDS, ATTRIBUTE_LEVELS, type StaffAttributes, type StaffInput } from "../types";
import styles from "./StaffForm.module.css";

interface StaffFormProps {
  initialValue?: StaffInput;
  onSubmit: (input: StaffInput) => void;
  onCancel?: () => void;
}

function defaultAttributes(): StaffAttributes {
  return {
    authority: 4,
    determination: 4,
    motivating: 4,
    attacking: 4,
    defending: 4,
    fitness: 4,
    goalkeeping: 4,
    possession: 4,
    setPieces: 4,
    tactical: 4,
    technical: 4,
    tacticalKnowledge: 4,
  };
}

export function StaffForm({ initialValue, onSubmit, onCancel }: StaffFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [tagsText, setTagsText] = useState((initialValue?.tags ?? []).join(", "));
  const [attributes, setAttributes] = useState<StaffAttributes>(initialValue?.attributes ?? defaultAttributes());
  const [error, setError] = useState<string | null>(null);

  function handleAttributeChange(key: keyof StaffAttributes, value: string) {
    setAttributes((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function parseTags(text: string): string[] {
    return text
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length === 0) {
      setError("Name is required");
      return;
    }
    setError(null);
    onSubmit({ name: name.trim(), tags: parseTags(tagsText), attributes });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label className={styles.field}>
        Name
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={styles.field}>
        Tags
        <input aria-label="Tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
      </label>
      {ATTRIBUTE_FIELDS.map((field) => (
        <label key={field.key} className={styles.field}>
          {field.label}
          <select
            aria-label={field.label}
            value={attributes[field.key]}
            onChange={(e) => handleAttributeChange(field.key, e.target.value)}
          >
            {ATTRIBUTE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      <div className={styles.actions}>
        <button type="submit">Save</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
