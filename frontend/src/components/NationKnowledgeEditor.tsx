import { NATIONS } from "../roles/nations";
import { NATION_KNOWLEDGE_LEVELS, type NationKnowledgeEntry } from "../roles/scout";
import styles from "./NationKnowledgeEditor.module.css";

interface NationKnowledgeEditorProps {
  entries: NationKnowledgeEntry[];
  onChange: (entries: NationKnowledgeEntry[]) => void;
}

export function NationKnowledgeEditor({ entries, onChange }: NationKnowledgeEditorProps) {
  function updateEntry(index: number, patch: Partial<NationKnowledgeEntry>) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function removeEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addEntry() {
    onChange([...entries, { nation: NATIONS[0], tier: 1 }]);
  }

  return (
    <div className={styles.editor}>
      {entries.map((entry, index) => (
        <div key={index} className={styles.row}>
          <input
            list="nation-options"
            aria-label={`Nation ${index + 1}`}
            value={entry.nation}
            onChange={(e) => updateEntry(index, { nation: e.target.value })}
          />
          <select
            aria-label={`Knowledge ${index + 1}`}
            value={entry.tier}
            onChange={(e) => updateEntry(index, { tier: Number(e.target.value) })}
          >
            {NATION_KNOWLEDGE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <button type="button" aria-label={`Remove nation ${index + 1}`} onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <datalist id="nation-options">
        {NATIONS.map((nation) => (
          <option key={nation} value={nation} />
        ))}
      </datalist>
      <button type="button" onClick={addEntry}>
        Add nation
      </button>
    </div>
  );
}
