import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { RaceTrack } from "../components/race/RaceTrack";
import type { Checkpoint, CheckpointCompletion, Participant, Project } from "../lib/database.types";

const CALENDAR_ID = "race-calendar-grid";

export function PublicShareView() {
  const { shareToken } = useParams();
  const [data, setData] = useState<{
    project: Project;
    checkpoints: Checkpoint[];
    participants: Participant[];
    completions: CheckpointCompletion[];
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
      const { data: completions } = checkpointIds.length
        ? await supabase.from("checkpoint_completions").select("*").in("checkpoint_id", checkpointIds)
        : { data: [] as CheckpointCompletion[] };

      setData({
        project: project as Project,
        checkpoints: (checkpoints ?? []) as Checkpoint[],
        participants: (participants ?? []) as unknown as Participant[],
        completions: (completions ?? []) as CheckpointCompletion[],
      });
    })();
  }, [shareToken]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center px-6">
        <p className="text-lg opacity-70">This race isn't public (or doesn't exist).</p>
      </div>
    );
  }

  if (!data) {
    return <p className="px-6 pt-10 opacity-60">Loading race…</p>;
  }

  const { project, checkpoints, participants, completions } = data;

  return (
    <div className="min-h-screen">
      <header className="px-6 py-4">
        <span className="font-display text-2xl font-semibold">🏁 Deadline Derby</span>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="font-display text-3xl font-semibold">{project.name}</h1>
        <p className="mb-6 text-sm opacity-60">Read-only view · {project.start_date} → {project.end_date}</p>
        <div className="relative">
          <MonthCalendar startDate={project.start_date} endDate={project.end_date} checkpoints={checkpoints} readOnly />
          <RaceTrack
            containerId={CALENDAR_ID}
            startDate={project.start_date}
            endDate={project.end_date}
            checkpoints={checkpoints}
            participants={participants}
            completions={completions}
          />
        </div>
      </main>
    </div>
  );
}
