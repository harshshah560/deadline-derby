// Two actions, both called from the frontend via supabase.functions.invoke
// (which attaches the caller's Supabase session JWT automatically):
//   { action: "list_repos", participantId }  -> { repos: string[] }
//   { action: "sync", participantId }        -> advances GitHub-sourced checkpoints
//
// v1 heuristic (see plan): any commit pushed to the connected repo since the
// last sync advances the participant's next incomplete "github" checkpoint,
// ordered by target_date. Good enough to start; can be replaced with a
// per-checkpoint commit/PR count rule later.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { action, participantId } = await req.json();

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Not authenticated" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: participant } = await admin
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .single();

  if (!participant || participant.user_id !== user.id) {
    return json({ error: "Not your participant record" }, 403);
  }

  const { data: connection } = await admin
    .from("github_connections")
    .select("*")
    .eq("participant_id", participantId)
    .single();

  if (!connection) return json({ error: "No GitHub connection for this participant" }, 400);

  const ghHeaders = {
    Authorization: `Bearer ${connection.github_access_token}`,
    "User-Agent": "deadline-derby",
    Accept: "application/vnd.github+json",
  };

  if (action === "list_repos") {
    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", { headers: ghHeaders });
    const repos = await res.json();
    return json({ repos: Array.isArray(repos) ? repos.map((r: { full_name: string }) => r.full_name) : [] });
  }

  if (action === "sync") {
    if (!participant.github_repo_full_name) return json({ error: "No repo linked yet" }, 400);

    const since = connection.last_synced_at ?? connection.connected_at;
    const commitsRes = await fetch(
      `https://api.github.com/repos/${participant.github_repo_full_name}/commits?since=${encodeURIComponent(since)}&per_page=50`,
      { headers: ghHeaders },
    );
    const commits = commitsRes.ok ? await commitsRes.json() : [];

    await admin
      .from("github_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("participant_id", participantId);

    if (!Array.isArray(commits) || commits.length === 0) {
      return json({ advanced: false, newCommits: 0 });
    }

    const { data: checkpoints } = await admin
      .from("checkpoints")
      .select("*")
      .eq("project_id", participant.project_id)
      .eq("progress_source", "github")
      .order("target_date");

    const { data: completions } = await admin
      .from("checkpoint_completions")
      .select("*")
      .eq("participant_id", participantId);

    const doneIds = new Set((completions ?? []).filter((c) => c.completed_at).map((c) => c.checkpoint_id));
    const nextCheckpoint = (checkpoints ?? []).find((c) => !doneIds.has(c.id));

    if (!nextCheckpoint) return json({ advanced: false, newCommits: commits.length });

    await admin.from("checkpoint_completions").upsert(
      {
        checkpoint_id: nextCheckpoint.id,
        participant_id: participantId,
        completed_at: new Date().toISOString(),
        completed_via: "github_commit",
        evidence_url: commits[0]?.html_url ?? null,
      },
      { onConflict: "checkpoint_id,participant_id" },
    );

    return json({ advanced: true, checkpointId: nextCheckpoint.id, newCommits: commits.length });
  }

  return json({ error: "Unknown action" }, 400);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
