import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CheckpointCompletion, Participant, Task } from "../lib/database.types";

interface Props {
  collaborators: Participant[];
  totalCheckpoints: number;
  completions: CheckpointCompletion[];
  tasks: Task[];
}

function streakDays(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((d) => differenceInCalendarDays(new Date(), d)));
  // A streak counts from today (0) or yesterday (1) backwards, so a single
  // missed "today" doesn't zero out a run that's still alive.
  let start = days.has(0) ? 0 : days.has(1) ? 1 : null;
  if (start === null) return 0;
  let streak = 0;
  while (days.has(start)) {
    streak += 1;
    start += 1;
  }
  return streak;
}

export function TeamProgress({ collaborators, totalCheckpoints, completions, tasks }: Props) {
  return (
    <div className="card-pop bg-white/80 p-4 dark:bg-white/10">
      <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">Team</h2>
      <ul className="flex flex-col gap-3">
        {collaborators.map((p) => {
          const checkpointsDone = completions.filter((c) => c.participant_id === p.id && c.completed_at).length;
          const myTasks = tasks.filter((t) => t.assigned_participant_id === p.id);
          const tasksDone = myTasks.filter((t) => t.status === "done").length;
          const total = totalCheckpoints + myTasks.length;
          const done = checkpointsDone + tasksDone;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          const completionDates = [
            ...completions.filter((c) => c.participant_id === p.id && c.completed_at).map((c) => parseISO(c.completed_at!)),
            ...myTasks.filter((t) => t.completed_at).map((t) => parseISO(t.completed_at!)),
          ];
          const streak = streakDays(completionDates);

          return (
            <li key={p.id} className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: p.profile?.avatar_color }}
                >
                  {p.profile?.avatar_emoji}
                </span>
                <span className="flex-1">{p.profile?.username ?? "Collaborator"}</span>
                {streak > 0 && <span title={`${streak}-day streak`}>🔥 {streak}</span>}
                <span className="opacity-60">
                  {done}/{total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
        {collaborators.length === 0 && <li className="text-sm opacity-50">No collaborators yet.</li>}
      </ul>
    </div>
  );
}
