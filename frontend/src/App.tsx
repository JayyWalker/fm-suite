import { useCallback, useEffect, useState } from "react";
import { RosterView } from "./components/RosterView";
import { StaffForm } from "./components/StaffForm";
import { createStaff, deleteStaff, listStaff, updateStaff } from "./api/staffApi";
import type { StaffInput, StaffMember } from "./types";

export function App() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  const refresh = useCallback(async () => {
    setStaff(await listStaff());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(input: StaffInput) {
    if (editing) {
      await updateStaff(editing.id, input);
    } else {
      await createStaff(input);
    }
    setShowForm(false);
    setEditing(null);
    await refresh();
  }

  async function handleDelete(id: number) {
    await deleteStaff(id);
    await refresh();
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
      {showForm && (
        <StaffForm
          initialValue={editing ? { name: editing.name, tags: editing.tags, attributes: editing.attributes } : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      <RosterView staff={staff} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
