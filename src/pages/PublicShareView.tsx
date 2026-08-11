import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import type { Checkpoint, CheckpointCompletion, Participant, Project, Task } from "../lib/database.types";

export function PublicShareView() {
  const { shareToken } = useParams();
  const [data, setData] = useState<{
    project: Project;
    checkpoints: Checkpoint[];
    participants: Participant[];
    completions: CheckpointCompletion[];
    tasks: Task[];
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    (async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("share_token", shareToken)
        .eq("is_public", true)
        .single();

      if (!project) {
        setNotFound(true);
        return;
      }

      const [{ data: checkpoints }, { data: participants }] = await Promise.all([
        supabase.from("checkpoints").select("*").eq("project_id", project.id).order("target_date"),
        supabase.from("participants").select("*, profile:profiles(*)").eq("project_id", project.id),
      ]);

      const checkpointIds = (checkpoints ?? []).map((c) => c.id);
      const [{ data: completions }, { data: tasks }] = checkpointIds.length
        ? await Promise.all([
            supabase.from("checkpoint_completions").select("*").in("checkpoint_id", checkpointIds),
            supabase.from("tasks").select("*").in("checkpoint_id", checkpointIds),
          ])
        : [{ data: [] as CheckpointCompletion[] }, { data: [] as Task[] }];

      setData({
        project: project as Project,
        checkpoints: (checkpoints ?? []) as Checkpoint[],
        participants: (participants ?? []) as unknown as Participant[],
        completions: (completions ?? []) as CheckpointCompletion[],
        tasks: (tasks ?? []) as Task[],
      });
    })();
  }, [shareToken]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center px-6">
        <p className="text-lg opacity-70">This project isn't public (or doesn't exist).</p>
      </div>
    );
  }

  if (!data) {
    return <p className="px-6 pt-10 opacity-60">Loading project…</p>;
  }

  const { project, checkpoints, participants, completions, tasks } = data;

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4">
        <span className="font-display text-2xl font-semibold">🏁 Deadline Derby</span>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="font-display text-3xl font-semibold">{project.name}</h1>
        <p className="mb-6 text-sm opacity-60">Read-only view · {project.start_date} → {project.end_date}</p>
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <MonthCalendar startDate={project.start_date} endDate={project.end_date} checkpoints={checkpoints} tasks={tasks} readOnly />
          <aside className="card-pop bg-white/80 p-4 dark:bg-white/10">
            <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">Team</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {participants
                .filter((p) => p.role !== "viewer")
                .map((p) => {
                  const done = completions.filter((c) => c.participant_id === p.id && c.completed_at).length;
                  return (
                    <li key={p.id} className="flex items-center gap-2">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ background: p.profile?.avatar_color }}
                      >
                        {p.profile?.avatar_emoji}
                      </span>
                      <span className="flex-1">{p.profile?.username ?? "Collaborator"}</span>
                      <span className="opacity-60">
                        {done}/{checkpoints.length}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
