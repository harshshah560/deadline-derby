import { type FormEvent, useState } from "react";
import { generatePlan, type Plan, type PlanCheckpoint } from "../lib/ai";
import { supabase } from "../lib/supabaseClient";

interface Props {
  projectId: string;
  startDate: string;
  endDate: string;
  existingCheckpointCount: number;
  userId: string;
  onApplied: () => void;
  onClose: () => void;
}

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
}

export function PlanAssistant({ projectId, startDate, endDate, existingCheckpointCount, userId, onApplied, onClose }: Props) {
  const [goal, setGoal] = useState("");
  const [refinement, setRefinement] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runGenerate = async (prompt: string, userLabel: string) => {
    setLoading(true);
    setError(null);
    try {
      const { plan } = await generatePlan({ projectId, goal: prompt, startDate, endDate });
      setDraft(plan);
      setTranscript((t) => [
        ...t,
        { role: "user", text: userLabel },
        { role: "assistant", text: `Drafted ${plan.checkpoints.length} checkpoint(s) with ${plan.checkpoints.reduce((n, c) => n + c.tasks.length, 0)} task(s).` },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong generating the plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleFirstGenerate = (e: FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    runGenerate(goal.trim(), goal.trim());
  };

  const handleRefine = (e: FormEvent) => {
    e.preventDefault();
    if (!refinement.trim() || !draft) return;
    const composed =
      `Original goal: ${goal}\n\nCurrent draft plan:\n${JSON.stringify(draft)}\n\n` +
      `Requested change: ${refinement.trim()}\n\nReturn the full updated plan.`;
    runGenerate(composed, refinement.trim());
    setRefinement("");
  };

  const updateCheckpoint = (index: number, patch: Partial<PlanCheckpoint>) => {
    if (!draft) return;
    const checkpoints = draft.checkpoints.map((c, i) => (i === index ? { ...c, ...patch } : c));
    setDraft({ checkpoints });
  };

  const removeCheckpoint = (index: number) => {
    if (!draft) return;
    setDraft({ checkpoints: draft.checkpoints.filter((_, i) => i !== index) });
  };

  const removeTask = (checkpointIndex: number, taskIndex: number) => {
    if (!draft) return;
    const checkpoints = draft.checkpoints.map((c, i) =>
      i === checkpointIndex ? { ...c, tasks: c.tasks.filter((_, ti) => ti !== taskIndex) } : c,
    );
    setDraft({ checkpoints });
  };

  const applyPlan = async () => {
    if (!draft || draft.checkpoints.length === 0) return;
    setApplying(true);
    setError(null);

    const { data: insertedCheckpoints, error: cpError } = await supabase
      .from("checkpoints")
      .insert(
        draft.checkpoints.map((c, i) => ({
          project_id: projectId,
          title: c.title,
          target_date: c.target_date,
          progress_source: "manual",
          sort_order: existingCheckpointCount + i,
          created_by: userId,
        })),
      )
      .select();

    if (cpError || !insertedCheckpoints) {
      setError(cpError?.message ?? "Could not save the plan.");
      setApplying(false);
      return;
    }

    const taskRows = draft.checkpoints.flatMap((c, i) =>
      c.tasks.map((t, ti) => ({
        checkpoint_id: insertedCheckpoints[i].id,
        title: t.title,
        due_date: t.due_date,
        sort_order: ti,
        created_by: userId,
      })),
    );

    if (taskRows.length > 0) {
      const { error: taskError } = await supabase.from("tasks").insert(taskRows);
      if (taskError) {
        setError(taskError.message);
        setApplying(false);
        return;
      }
    }

    setApplying(false);
    onApplied();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card-pop flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto bg-white p-6 dark:bg-[#241b33]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Plan with AI ✨</h3>
          <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>

        {transcript.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {transcript.map((t, i) => (
              <li
                key={i}
                className={`rounded-[var(--radius-md)] px-3 py-2 ${t.role === "user" ? "bg-black/5 dark:bg-white/10" : "bg-[var(--color-accent-2)]/30"}`}
              >
                {t.text}
              </li>
            ))}
          </ul>
        )}

        {!draft && (
          <form onSubmit={handleFirstGenerate} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-display text-sm font-semibold">What are you building?</span>
              <textarea
                required
                autoFocus
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="A portfolio site with a blog, project gallery, and contact form, launching in 6 weeks."
                className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 text-sm dark:bg-black/20"
              />
            </label>
            <button disabled={loading || !goal.trim()} type="submit" className="btn-fun bg-[var(--color-primary)] text-white">
              {loading ? "Thinking…" : "Generate a plan"}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {draft && (
          <>
            <ul className="flex flex-col gap-3">
              {draft.checkpoints.map((c, ci) => (
                <li key={ci} className="card-pop bg-black/5 p-3 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <input
                      value={c.title}
                      onChange={(e) => updateCheckpoint(ci, { title: e.target.value })}
                      className="flex-1 rounded-[var(--radius-md)] border border-black/10 bg-white px-2 py-1 text-sm font-semibold dark:bg-black/20"
                    />
                    <input
                      type="date"
                      value={c.target_date}
                      min={startDate}
                      max={endDate}
                      onChange={(e) => updateCheckpoint(ci, { target_date: e.target.value })}
                      className="rounded-[var(--radius-md)] border border-black/10 bg-white px-2 py-1 text-xs dark:bg-black/20"
                    />
                    <button onClick={() => removeCheckpoint(ci)} className="text-xs opacity-50 hover:opacity-100">
                      ✕
                    </button>
                  </div>
                  {c.rationale && <p className="mt-1 text-xs opacity-60">{c.rationale}</p>}
                  <ul className="mt-2 flex flex-col gap-1">
                    {c.tasks.map((t, ti) => (
                      <li key={ti} className="flex items-center gap-2 text-xs">
                        <span className="opacity-40">·</span>
                        <span className="flex-1">{t.title}</span>
                        <span className="opacity-50">{t.due_date}</span>
                        <button onClick={() => removeTask(ci, ti)} className="opacity-50 hover:opacity-100">
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <form onSubmit={handleRefine} className="flex gap-2">
              <input
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                placeholder="Refine it… e.g. push design back a week"
                className="flex-1 rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-1.5 text-sm dark:bg-black/20"
              />
              <button disabled={loading || !refinement.trim()} type="submit" className="btn-fun bg-black/5 text-xs">
                {loading ? "…" : "Regenerate"}
              </button>
            </form>

            <button disabled={applying} onClick={applyPlan} className="btn-fun bg-[var(--color-primary)] text-white">
              {applying ? "Applying…" : "Apply to project"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
