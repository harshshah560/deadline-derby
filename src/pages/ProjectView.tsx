import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useProject } from "../hooks/useProject";
import { supabase } from "../lib/supabaseClient";
import { AppHeader } from "../components/AppHeader";
import { MonthCalendar } from "../components/calendar/MonthCalendar";
import { DayPanel } from "../components/calendar/DayPanel";
import { CheckpointForm } from "../components/CheckpointForm";
import { InviteModal } from "../components/InviteModal";
import { GithubConnectButton } from "../components/GithubConnectButton";
import { TeamProgress } from "../components/TeamProgress";
import { CommentThread } from "../components/CommentThread";
import { PlanAssistant } from "../components/PlanAssistant";
import { fireConfetti } from "../components/celebration/ConfettiBurst";
import type { ProgressSource, Task } from "../lib/database.types";

export function ProjectView() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { bundle, loading, reload } = useProject(projectId);
  const [showCheckpointForm, setShowCheckpointForm] = useState<string | undefined>();
  const [showInvite, setShowInvite] = useState(false);
  const [showPlanAssistant, setShowPlanAssistant] = useState(false);
  const [showDay, setShowDay] = useState<string | undefined>();
  const [openThread, setOpenThread] = useState<string | undefined>();

  const me = useMemo(
    () => bundle?.participants.find((p) => p.user_id === user?.id),
    [bundle, user],
  );
  const isOwner = me?.role === "owner";

  if (loading || !bundle) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <p className="px-6 opacity-60">Loading your project…</p>
      </div>
    );
  }

  const { project, checkpoints, participants, completions, tasks, comments } = bundle;

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
    setShowDay(undefined);
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

  const handleToggleTask = async (task: Task) => {
    const done = task.status === "done";
    await supabase
      .from("tasks")
      .update({ status: done ? "todo" : "done", completed_at: done ? null : new Date().toISOString() })
      .eq("id", task.id);
    if (!done) fireConfetti();
    reload();
  };

  const handleAddTask = async (title: string, checkpointId: string, dueDate?: string) => {
    await supabase.from("tasks").insert({
      checkpoint_id: checkpointId,
      title,
      due_date: dueDate ?? null,
      sort_order: tasks.filter((t) => t.checkpoint_id === checkpointId).length,
      created_by: user?.id,
    });
    reload();
  };

  const togglePublic = async () => {
    await supabase.from("projects").update({ is_public: !project.is_public }).eq("id", project.id);
    reload();
  };

  const isDone = (checkpointId: string, participantId: string) =>
    completions.some((c) => c.checkpoint_id === checkpointId && c.participant_id === participantId && c.completed_at);

  const collaborators = participants.filter((p) => p.role !== "viewer");
  const canEdit = !!me && me.role !== "viewer";

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
              <button onClick={() => setShowPlanAssistant(true)} className="btn-fun bg-[var(--color-purple)] text-white">
                ✨ Plan with AI
              </button>
            )}
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

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <MonthCalendar
            startDate={project.start_date}
            endDate={project.end_date}
            checkpoints={checkpoints}
            tasks={tasks}
            onDayClick={(day) => setShowDay(day)}
          />

          <aside className="flex flex-col gap-4">
            <TeamProgress
              collaborators={collaborators}
              totalCheckpoints={checkpoints.length}
              completions={completions}
              tasks={tasks}
            />

            {me && me.role !== "viewer" && (
              <div className="card-pop bg-white/80 p-4 dark:bg-white/10">
                <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">GitHub</h2>
                <GithubConnectButton participant={me} onSynced={reload} />
              </div>
            )}

            <div className="card-pop bg-white/80 p-4 dark:bg-white/10">
              <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">Checkpoints</h2>
              <ul className="flex flex-col gap-3">
                {checkpoints.map((c) => {
                  const mine = me ? isDone(c.id, me.id) : false;
                  const checkpointTasks = tasks.filter((t) => t.checkpoint_id === c.id);
                  return (
                    <li key={c.id} className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className={mine ? "line-through opacity-50" : ""}>
                          {c.title} · {c.target_date}
                        </span>
                        <div className="flex items-center gap-1">
                          {canEdit && !mine && c.progress_source === "manual" && (
                            <button onClick={() => handleMarkDone(c.id)} className="btn-fun bg-black/5 text-xs">
                              Done
                            </button>
                          )}
                          <button
                            onClick={() => setOpenThread(openThread === c.id ? undefined : c.id)}
                            className="text-xs opacity-50 hover:opacity-100"
                            title="Comments"
                          >
                            💬
                          </button>
                        </div>
                      </div>
                      {checkpointTasks.length > 0 && (
                        <ul className="ml-3 flex flex-col gap-0.5">
                          {checkpointTasks.map((t) => (
                            <li key={t.id} className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={t.status === "done"}
                                disabled={!canEdit}
                                onChange={() => handleToggleTask(t)}
                              />
                              <span className={t.status === "done" ? "line-through opacity-50" : ""}>{t.title}</span>
                              {t.due_date && <span className="opacity-40">{t.due_date}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {openThread === c.id && (
                        <div className="ml-3 mt-1">
                          <CommentThread
                            projectId={project.id}
                            checkpointId={c.id}
                            comments={comments}
                            myParticipantId={me?.id}
                            onPosted={reload}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
                {checkpoints.length === 0 && (
                  <li className="text-sm opacity-50">
                    No checkpoints yet.{" "}
                    {isOwner && (
                      <button onClick={() => setShowPlanAssistant(true)} className="underline">
                        Plan with AI
                      </button>
                    )}
                  </li>
                )}
              </ul>
            </div>

            <div className="card-pop bg-white/80 p-4 dark:bg-white/10">
              <h2 className="font-display mb-2 text-sm font-semibold uppercase opacity-60">Project chat</h2>
              <CommentThread projectId={project.id} comments={comments} myParticipantId={me?.id} onPosted={reload} />
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

      {showDay && (
        <DayPanel
          dateKey={showDay}
          checkpoints={checkpoints}
          tasks={tasks}
          canEdit={canEdit}
          onToggleTask={handleToggleTask}
          onAddTask={(title, checkpointId) => handleAddTask(title, checkpointId, showDay)}
          onAddCheckpoint={() => {
            setShowDay(undefined);
            setShowCheckpointForm(showDay);
          }}
          onClose={() => setShowDay(undefined)}
        />
      )}

      {showInvite && <InviteModal projectId={project.id} onClose={() => setShowInvite(false)} />}

      {showPlanAssistant && user && (
        <PlanAssistant
          projectId={project.id}
          startDate={project.start_date}
          endDate={project.end_date}
          existingCheckpointCount={checkpoints.length}
          userId={user.id}
          onApplied={() => {
            setShowPlanAssistant(false);
            reload();
          }}
          onClose={() => setShowPlanAssistant(false)}
        />
      )}
    </div>
  );
}
