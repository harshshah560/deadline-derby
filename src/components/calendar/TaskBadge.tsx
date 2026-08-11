import type { Task } from "../../lib/database.types";

interface Props {
  task: Task;
}

export function TaskBadge({ task }: Props) {
  return (
    <span
      title={task.title}
      className={`h-1.5 w-1.5 rounded-full ${task.status === "done" ? "bg-[var(--color-accent)]" : "bg-black/30 dark:bg-white/40"}`}
    />
  );
}
