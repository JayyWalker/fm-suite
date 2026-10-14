import { useEffect, useState } from "react";
import { ATTRIBUTE_LEVELS, type StaffInput } from "../types";
import { ROLES, STAFF_ROLES, type StaffRole } from "../roles/index";
import { NationKnowledgeEditor } from "./NationKnowledgeEditor";
import type { NationKnowledgeEntry } from "../roles/scout";
import styles from "./StaffForm.module.css";

interface StaffFormProps {
  initialValue?: StaffInput;
  onSubmit: (input: StaffInput) => void;
  onCancel?: () => void;
}

export function StaffForm({ initialValue, onSubmit, onCancel }: StaffFormProps) {
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(initialValue?.role ?? null);
  const [name, setName] = useState(initialValue?.name ?? "");
  const [tagsText, setTagsText] = useState((initialValue?.tags ?? []).join(", "));
  const [attributes, setAttributes] = useState<Record<string, number>>(
    (initialValue?.attributes as unknown as Record<string, number>) ?? {},
  );
  const [nationKnowledge, setNationKnowledge] = useState<NationKnowledgeEntry[]>(
    initialValue?.role === "scout"
      ? ((initialValue.attributes as unknown as { nationKnowledge: NationKnowledgeEntry[] }).nationKnowledge ?? [])
      : [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleSelectRole(role: StaffRole) {
    setSelectedRole(role);
    setAttributes(ROLES[role].defaultAttributes);
    setNationKnowledge([]);
  }

  function handleAttributeChange(key: string, value: string) {
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
    if (!selectedRole) return;
    if (name.trim().length === 0) {
      setError("Name is required");
      return;
    }
    setError(null);
    const finalAttributes = selectedRole === "scout" ? { ...attributes, nationKnowledge } : attributes;
    onSubmit({
      role: selectedRole,
      name: name.trim(),
      tags: parseTags(tagsText),
      attributes: finalAttributes,
    } as unknown as StaffInput);
  }

  const title = initialValue
    ? `Edit ${ROLES[initialValue.role].label.toLowerCase()}`
    : selectedRole
      ? `Add ${ROLES[selectedRole].label.toLowerCase()}`
      : "Add staff";

  return (
    <div className={styles.backdrop} onClick={() => onCancel?.()}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3>{title}</h3>
          <button type="button" aria-label="Close" className={styles.closeButton} onClick={() => onCancel?.()}>
            ✕
          </button>
        </div>

        {!selectedRole ? (
          <div className={styles.body}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Choose a role</div>
              <div className={styles.fieldRow}>
                {STAFF_ROLES.map((role) => (
                  <button key={role} type="button" onClick={() => handleSelectRole(role)}>
                    {ROLES[role].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.body}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Identity</div>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  Name
                  <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className={styles.field}>
                  Tags
                  <input aria-label="Tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
                </label>
              </div>
            </div>

            {ROLES[selectedRole].formGroups.map((group) => (
              <div key={group.title} className={styles.section}>
                <div className={styles.sectionTitle}>{group.title}</div>
                <div className={styles.fieldRow}>
                  {group.fields.map((field) => (
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
                </div>
              </div>
            ))}

            {selectedRole === "scout" && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Scouting Knowledge</div>
                <NationKnowledgeEditor entries={nationKnowledge} onChange={setNationKnowledge} />
              </div>
            )}

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
        )}
      </div>
    </div>
  );
}
