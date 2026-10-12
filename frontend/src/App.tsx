import { useCallback, useEffect, useState } from "react";
import { RosterView } from "./components/RosterView";
import { StaffForm } from "./components/StaffForm";
import { createStaff, deleteStaff, listStaff, updateStaff } from "./api/staffApi";
import type { StaffInput, StaffMember } from "./types";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
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
        await updateStaff(editing.id, input);
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
    <div>
      <button onClick={handleAddClick}>Add staff</button>
      {error && <div role="alert">{error}</div>}
      {showForm && (
        <StaffForm
          key={editing?.id ?? "new"}
          initialValue={editing ? { name: editing.name, tags: editing.tags, attributes: editing.attributes } : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      <RosterView staff={staff} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
