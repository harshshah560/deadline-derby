import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Checkpoint, CheckpointCompletion, Participant, Project } from "../lib/database.types";

export interface ProjectBundle {
  project: Project;
  checkpoints: Checkpoint[];
  participants: Participant[];
  completions: CheckpointCompletion[];
}

async function fetchBundle(projectId: string): Promise<ProjectBundle | null> {
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return null;

  const [{ data: checkpoints }, { data: participants }] = await Promise.all([
    supabase.from("checkpoints").select("*").eq("project_id", projectId).order("target_date"),
    supabase.from("participants").select("*, profile:profiles(*)").eq("project_id", projectId),
  ]);

  const checkpointIds = (checkpoints ?? []).map((c) => c.id);
  const { data: completions } = checkpointIds.length
    ? await supabase.from("checkpoint_completions").select("*").in("checkpoint_id", checkpointIds)
    : { data: [] as CheckpointCompletion[] };

  return {
    project: project as Project,
    checkpoints: (checkpoints ?? []) as Checkpoint[],
    participants: (participants ?? []) as unknown as Participant[],
    completions: (completions ?? []) as CheckpointCompletion[],
  };
}

export function useProject(projectId: string | undefined) {
  const [bundle, setBundle] = useState<ProjectBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!projectId) return;
    const next = await fetchBundle(projectId);
    setBundle(next);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    reload();

    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkpoint_completions" },
        () => reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `project_id=eq.${projectId}` },
        () => reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkpoints", filter: `project_id=eq.${projectId}` },
        () => reload(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, reload]);

  return { bundle, loading, reload };
}
