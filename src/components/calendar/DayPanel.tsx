import { type FormEvent, useState } from "react";
import { format } from "date-fns";
import type { Checkpoint, Task } from "../../lib/database.types";

interface Props {
  dateKey: string;
  checkpoints: Checkpoint[];
  tasks: Task[];
  canEdit: boolean;
  onToggleTask: (task: Task) => void;
  onAddTask: (title: string, checkpointId: string) => void;
  onAddCheckpoint: () => void;
  onClose: () => void;
}

export function DayPanel({ dateKey, checkpoints, tasks, canEdit, onToggleTask, onAddTask, onAddCheckpoint, onClose }: Props) {
  const [title, setTitle] = useState("");
  // Default to the nearest checkpoint on or after this day, falling back to the last one.
  const defaultCheckpoint =
    checkpoints.filter((c) => c.target_date >= dateKey).sort((a, b) => a.target_date.localeCompare(b.target_date))[0] ??
    checkpoints[checkpoints.length - 1];
  const [checkpointId, setCheckpointId] = useState(defaultCheckpoint?.id ?? "");

  const dayCheckpoints = checkpoints.filter((c) => c.target_date === dateKey);
  const dayTasks = tasks.filter((t) => t.due_date === dateKey);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !checkpointId) return;
    onAddTask(title.trim(), checkpointId);
    setTitle("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card-pop flex w-full max-w-sm flex-col gap-4 bg-white p-6 dark:bg-[#241b33]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{format(new Date(`${dateKey}T00:00:00`), "EEEE, MMM d")}</h3>
          <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>

        {dayCheckpoints.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase opacity-50">Checkpoints</h4>
            <ul className="flex flex-col gap-1 text-sm">
              {dayCheckpoints.map((c) => (
                <li key={c.id}>🎯 {c.title}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase opacity-50">Tasks</h4>
          <ul className="flex flex-col gap-1 text-sm">
            {dayTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.status === "done"}
                  disabled={!canEdit}
                  onChange={() => onToggleTask(t)}
                />
                <span className={t.status === "done" ? "line-through opacity-50" : ""}>{t.title}</span>
              </li>
            ))}
            {dayTasks.length === 0 && <li className="text-xs opacity-50">No tasks due this day.</li>}
          </ul>
        </div>

        {canEdit && checkpoints.length > 0 && (
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a task for this day"
                className="flex-1 rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-1.5 text-sm dark:bg-black/20"
              />
              <button disabled={!title.trim() || !checkpointId} type="submit" className="btn-fun bg-black/5 text-xs">
                Add
              </button>
            </div>
            <select
              value={checkpointId}
              onChange={(e) => setCheckpointId(e.target.value)}
              className="rounded-[var(--radius-md)] border border-black/10 bg-white px-2 py-1 text-xs dark:bg-black/20"
            >
              {checkpoints.map((c) => (
                <option key={c.id} value={c.id}>
                  Under: {c.title}
                </option>
              ))}
            </select>
          </form>
        )}
        {canEdit && checkpoints.length === 0 && (
          <p className="text-xs opacity-50">Add a checkpoint first so tasks have somewhere to live.</p>
        )}

        {canEdit && (
          <button onClick={onAddCheckpoint} className="btn-fun bg-[var(--color-accent-2)] text-sm">
            + New checkpoint on this day
          </button>
        )}
      </div>
    </div>
  );
}
