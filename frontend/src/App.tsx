import { useCallback, useEffect, useState } from "react";
import { RosterView } from "./components/RosterView";
import { StaffForm } from "./components/StaffForm";
import { createStaff, deleteStaff, listStaff, updateStaff } from "./api/staffApi";
import type { StaffInput, StaffMember } from "./types";
import styles from "./App.module.css";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toStaffInput(member: StaffMember): StaffInput {
  if (member.role === "coach") {
    return { role: "coach", name: member.name, tags: member.tags, attributes: member.attributes };
  }
  if (member.role === "scout") {
    return { role: "scout", name: member.name, tags: member.tags, attributes: member.attributes };
  }
  return { role: "physio", name: member.name, tags: member.tags, attributes: member.attributes };
}

export function App() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStaff(await listStaff());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(input: StaffInput) {
    try {
      if (editing) {
        const { role: _role, ...patch } = input;
        await updateStaff(editing.id, patch);
      } else {
        await createStaff(input);
      }
      setShowForm(false);
      setEditing(null);
      setError(null);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteStaff(id);
      setError(null);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function handleEdit(member: StaffMember) {
    setEditing(member);
    setShowForm(true);
  }

  function handleAddClick() {
    setEditing(null);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>FM26 Coach Rating Tool</h1>
        <button className={styles.addButton} onClick={handleAddClick}>
          Add staff
        </button>
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      {showForm && (
        <StaffForm
          key={editing?.id ?? "new"}
          initialValue={editing ? toStaffInput(editing) : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      <RosterView staff={staff} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
