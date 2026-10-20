import { useEffect, useState } from "react";
import { ATTRIBUTE_LEVELS, type StaffInput } from "../types";
import { ROLES, STAFF_ROLES, type StaffRole } from "../roles/index";
import { NationKnowledgeEditor } from "./NationKnowledgeEditor";
import type { NationKnowledgeEntry } from "../roles/scout";
import { ScreenshotUpload } from "./ScreenshotUpload";
import type { ParseScreenshotResult } from "../api/staffApi";
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
  const [warnings, setWarnings] = useState<{ unmatched: string[]; lowConfidence: string[] }>({
    unmatched: [],
    lowConfidence: [],
  });

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
    setWarnings({ unmatched: [], lowConfidence: [] });
  }

  function handleAttributeChange(key: string, value: string) {
    setAttributes((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function applyParsedName(result: ParseScreenshotResult) {
    if (result.name) setName(result.name);
    return result.nameLowConfidence ? [...result.lowConfidence, "Name"] : result.lowConfidence;
  }

  function handleAttributesResult(result: ParseScreenshotResult) {
    if (result.matched) {
      setAttributes((prev) => ({ ...prev, ...result.matched }));
    }
    setWarnings({ unmatched: result.unmatched, lowConfidence: applyParsedName(result) });
  }

  function handleNationResult(result: ParseScreenshotResult) {
    if (result.nationEntries) {
      setNationKnowledge((prev) => {
        const byNation = new Map(prev.map((entry) => [entry.nation, entry]));
        for (const entry of result.nationEntries!) {
          byNation.set(entry.nation, entry);
        }
        return Array.from(byNation.values());
      });
    }
    setWarnings({ unmatched: result.unmatched, lowConfidence: applyParsedName(result) });
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
    ? `Edit ${ROLES[selectedRole!].label.toLowerCase()}`
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
          <button
            type="button"
            aria-label="Close"
            className={styles.closeButton}
            onClick={() => onCancel?.()}
          >
            ✕
          </button>
        </div>

        {!selectedRole ? (
          <div className={styles.body}>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                Choose a role
                <select
                  aria-label="Choose a role"
                  value=""
                  onChange={(e) => handleSelectRole(e.target.value as StaffRole)}
                >
                  <option value="" disabled>
                    Choose a role
                  </option>
                  {STAFF_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLES[role].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.body}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Identity</div>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  Name
                  <input
                    aria-label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  Tags
                  <input
                    aria-label="Tags"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  Role
                  <select
                    aria-label="Role"
                    value={selectedRole}
                    onChange={(e) =>
                      handleSelectRole(e.target.value as StaffRole)
                    }
                  >
                    {STAFF_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLES[role].label}
                      </option>
                    ))}
                  </select>
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
                        onChange={(e) =>
                          handleAttributeChange(field.key, e.target.value)
                        }
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

            {selectedRole && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>
                  Import from screenshot
                </div>
                <ScreenshotUpload
                  role={selectedRole}
                  label="Upload screenshot"
                  onResult={handleAttributesResult}
                />
                {selectedRole === 'scout' && (
                  <ScreenshotUpload
                    role="scout"
                    panel="nationKnowledge"
                    label="Upload nation knowledge screenshot"
                    onResult={handleNationResult}
                  />
                )}
                {(warnings.unmatched.length > 0 ||
                  warnings.lowConfidence.length > 0) && (
                  <div role="status">
                    {warnings.unmatched.length > 0 && (
                      <div>
                        Couldn't confidently read:{' '}
                        {warnings.unmatched.join(', ')}
                      </div>
                    )}
                    {warnings.lowConfidence.length > 0 && (
                      <div>
                        Low confidence, please double check:{' '}
                        {warnings.lowConfidence.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedRole === 'scout' && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Scouting Knowledge</div>
                <NationKnowledgeEditor
                  entries={nationKnowledge}
                  onChange={setNationKnowledge}
                />
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
  )
}
