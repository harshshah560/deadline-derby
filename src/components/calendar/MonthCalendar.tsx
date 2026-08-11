import { format, isToday } from "date-fns";
import { buildCalendarLayout } from "../../lib/calendarLayout";
import type { Checkpoint, Task } from "../../lib/database.types";
import { CheckpointBadge } from "./CheckpointBadge";
import { TaskBadge } from "./TaskBadge";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  startDate: string;
  endDate: string;
  checkpoints: Checkpoint[];
  tasks?: Task[];
  onDayClick?: (dateKey: string) => void;
  onCheckpointClick?: (checkpoint: Checkpoint) => void;
  readOnly?: boolean;
}

export function MonthCalendar({
  startDate,
  endDate,
  checkpoints,
  tasks = [],
  onDayClick,
  onCheckpointClick,
  readOnly,
}: Props) {
  const { weeks } = buildCalendarLayout(startDate, endDate);
  const rangeStart = new Date(`${startDate}T00:00:00`);
  const rangeEnd = new Date(`${endDate}T00:00:00`);

  const checkpointsByDay = new Map<string, Checkpoint[]>();
  for (const c of checkpoints) {
    const list = checkpointsByDay.get(c.target_date) ?? [];
    list.push(c);
    checkpointsByDay.set(c.target_date, list);
  }

  const tasksByDay = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.due_date) continue;
    const list = tasksByDay.get(t.due_date) ?? [];
    list.push(t);
    tasksByDay.set(t.due_date, list);
  }

  return (
    <div id="race-calendar-grid" className="card-pop overflow-hidden bg-white/80 p-4 dark:bg-white/10 sm:p-6">
      <div className="mb-2 grid grid-cols-7 gap-2 text-center">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="font-display text-xs font-semibold uppercase opacity-50">
            {d}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-2">
            {week.map((day) => {
              const inRange = day.date >= rangeStart && day.date <= rangeEnd;
              const dayCheckpoints = checkpointsByDay.get(day.key) ?? [];
              const dayTasks = tasksByDay.get(day.key) ?? [];
              return (
                <button
                  key={day.key}
                  type="button"
                  disabled={readOnly || !inRange}
                  onClick={() => onDayClick?.(day.key)}
                  data-day-key={day.key}
                  className={`relative flex aspect-square flex-col items-center justify-start rounded-[var(--radius-md)] border p-1 text-sm transition ${
                    inRange
                      ? "border-black/5 bg-white/60 hover:-translate-y-0.5 hover:shadow-md dark:bg-black/20"
                      : "border-transparent opacity-25"
                  } ${isToday(day.date) ? "ring-2 ring-[var(--color-accent)]" : ""}`}
                >
                  <span className="mt-0.5 rounded-full px-1.5 text-xs font-semibold opacity-70">
                    {day.isFirstOfMonth ? format(day.date, "MMM d") : format(day.date, "d")}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
                    {dayCheckpoints.map((c) => (
                      <CheckpointBadge
                        key={c.id}
                        checkpoint={c}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheckpointClick?.(c);
                        }}
                      />
                    ))}
                  </div>
                  {dayTasks.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
                      {dayTasks.slice(0, 4).map((t) => (
                        <TaskBadge key={t.id} task={t} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
