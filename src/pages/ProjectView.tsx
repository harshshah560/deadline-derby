import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProject";
import { supabase } from "../lib/supabaseClient";
import { AppHeader } from "../components/AppHeader";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { RaceTrack } from "../components/race/RaceTrack";
import { CheckpointForm } from "../components/CheckpointForm";
import { InviteModal } from "../components/InviteModal";
import { GithubConnectButton } from "../components/GithubConnectButton";
import { fireConfetti } from "../components/race/ConfettiBurst";
import type { ProgressSource } from "../lib/database.types";

const CALENDAR_ID = "race-calendar-grid";

export function ProjectView() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { bundle, loading, reload } = useProject(projectId);
  const [showCheckpointForm, setShowCheckpointForm] = useState<string | undefined>();
  const [showInvite, setShowInvite] = useState(false);

  const me = useMemo(
    () => bundle?.participants.find((p) => p.user_id === user?.id),
    [bundle, user],
  );
  const isOwner = me?.role === "owner";

  if (loading || !bundle) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <p className="px-6 opacity-60">Loading the track…</p>
      </div>
    );
  }

  const { project, checkpoints, participants, completions } = bundle;

  const handleAddCheckpoint = async (values: {
    title: string;
    targetDate: string;
    progressSource: ProgressSource;
  }) => {
    await supabase.from("checkpoints").insert({
      project_id: project.id,
      title: values.title,
      target_date: values.targetDate,
      progress_source: values.progressSource,
      sort_order: checkpoints.length,
      created_by: user?.id,
    });
    setShowCheckpointForm(undefined);
    reload();
  };

  const handleMarkDone = async (checkpointId: string) => {
    if (!me) return;
    await supabase
      .from("checkpoint_completions")
      .upsert(
        { checkpoint_id: checkpointId, participant_id: me.id, completed_at: new Date().toISOString(), completed_via: "manual" },
        { onConflict: "checkpoint_id,participant_id" },
      );
    fireConfetti();
    reload();
  };

  const togglePublic = async () => {
    await supabase.from("projects").update({ is_public: !project.is_public }).eq("id", project.id);
    reload();
  };

  const isDone = (checkpointId: string, participantId: string) =>
    completions.some((c) => c.checkpoint_id === checkpointId && c.participant_id === participantId && c.completed_at);

  const racers = participants.filter((p) => p.role !== "viewer");

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold">{project.name}</h1>
            <p className="text-sm opacity-60">
              {project.start_date} → {project.end_date}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <button onClick={() => setShowCheckpointForm(project.start_date)} className="btn-fun bg-[var(--color-accent-2)]">
                + Checkpoint
              </button>
            )}
            {isOwner && (
              <button onClick={() => setShowInvite(true)} className="btn-fun bg-[var(--color-purple)] text-white">
                Invite
              </button>
            )}
            {isOwner && (
              <button onClick={togglePublic} className="btn-fun bg-black/5 text-sm">
                {project.is_public ? "🌍 Public (share link on)" : "🔒 Make public"}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="relative">
            <MonthCalendar
              startDate={project.start_date}
              endDate={project.end_date}
              checkpoints={checkpoints}
              onDayClick={isOwner ? (day) => setShowCheckpointForm(day) : undefined}
            />
            <RaceTrack
              containerId={CALENDAR_ID}
              startDate={project.start_date}
              endDate={project.end_date}
              checkpoints={checkpoints}
              participants={participants}
              completions={completions}
            />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="card-pop bg-white/80 p-4 dark:bg-white/10">
              <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">Racers</h2>
              <ul className="flex flex-col gap-2">
                {racers.map((p) => {
                  const done = completions.filter((c) => c.participant_id === p.id && c.completed_at).length;
                  return (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ background: p.profile?.avatar_color }}
                      >
                        {p.profile?.avatar_emoji}
                      </span>
                      <span className="flex-1">{p.profile?.username ?? "Racer"}</span>
                      <span className="opacity-60">
                        {done}/{checkpoints.length}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {me && me.role !== "viewer" && (
              <div className="card-pop bg-white/80 p-4 dark:bg-white/10">
                <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">GitHub</h2>
                <GithubConnectButton participant={me} onSynced={reload} />
              </div>
            )}

            <div className="card-pop bg-white/80 p-4 dark:bg-white/10">
              <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">Checkpoints</h2>
              <ul className="flex flex-col gap-2">
                {checkpoints.map((c) => {
                  const mine = me ? isDone(c.id, me.id) : false;
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className={mine ? "line-through opacity-50" : ""}>
                        {c.title} · {c.target_date}
                      </span>
                      {me && me.role !== "viewer" && !mine && c.progress_source === "manual" && (
                        <button onClick={() => handleMarkDone(c.id)} className="btn-fun bg-black/5 text-xs">
                          Mark done
                        </button>
                      )}
                    </li>
                  );
                })}
                {checkpoints.length === 0 && <li className="text-sm opacity-50">No checkpoints yet.</li>}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {showCheckpointForm !== undefined && (
        <CheckpointForm
          initialDate={showCheckpointForm}
          minDate={project.start_date}
          maxDate={project.end_date}
          hasGithubRepo={!!me?.github_repo_full_name}
          onCancel={() => setShowCheckpointForm(undefined)}
          onSubmit={handleAddCheckpoint}
        />
      )}

      {showInvite && <InviteModal projectId={project.id} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
