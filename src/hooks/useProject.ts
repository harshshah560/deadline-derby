import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Checkpoint, CheckpointCompletion, Comment, Participant, Project, Task } from "../lib/database.types";

export interface ProjectBundle {
  project: Project;
  checkpoints: Checkpoint[];
  participants: Participant[];
  completions: CheckpointCompletion[];
  tasks: Task[];
  comments: Comment[];
}

async function fetchBundle(projectId: string): Promise<ProjectBundle | null> {
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (!project) return null;

  const [{ data: checkpoints }, { data: participants }, { data: comments }] = await Promise.all([
    supabase.from("checkpoints").select("*").eq("project_id", projectId).order("target_date"),
    supabase.from("participants").select("*, profile:profiles(*)").eq("project_id", projectId),
    supabase.from("comments").select("*, author:participants(*, profile:profiles(*))").eq("project_id", projectId).order("created_at"),
  ]);

  const checkpointIds = (checkpoints ?? []).map((c) => c.id);
  const [{ data: completions }, { data: tasks }] = checkpointIds.length
    ? await Promise.all([
        supabase.from("checkpoint_completions").select("*").in("checkpoint_id", checkpointIds),
        supabase.from("tasks").select("*").in("checkpoint_id", checkpointIds).order("due_date"),
      ])
    : [{ data: [] as CheckpointCompletion[] }, { data: [] as Task[] }];

  return {
    project: project as Project,
    checkpoints: (checkpoints ?? []) as Checkpoint[],
    participants: (participants ?? []) as unknown as Participant[],
    completions: (completions ?? []) as CheckpointCompletion[],
    tasks: (tasks ?? []) as Task[],
    comments: (comments ?? []) as unknown as Comment[],
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
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => reload())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `project_id=eq.${projectId}` },
        () => reload(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, reload]);

  return { bundle, loading, reload };
}
