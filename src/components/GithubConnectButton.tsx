import { useEffect, useState } from "react";
import { listMyGithubRepos, startGithubRepoConnect, syncGithubProgress } from "../lib/github";
import { supabase } from "../lib/supabaseClient";
import type { Participant } from "../lib/database.types";

interface Props {
  participant: Participant;
  onSynced?: () => void;
}

export function GithubConnectButton({ participant, onSynced }: Props) {
  const [repos, setRepos] = useState<string[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const needsPicker = !participant.github_repo_full_name || changing;

  useEffect(() => {
    if (!needsPicker) return;
    let cancelled = false;
    setRepos(null);
    listMyGithubRepos(participant.id)
      .then((r) => !cancelled && setRepos(r))
      .catch(() => !cancelled && setRepos(null));
    return () => {
      cancelled = true;
    };
  }, [participant.id, needsPicker]);

  const selectRepo = async (repo: string) => {
    setSaving(true);
    await supabase.from("participants").update({ github_repo_full_name: repo }).eq("id", participant.id);
    setSaving(false);
    setChanging(false);
    onSynced?.();
  };

  if (needsPicker) {
    if (repos) {
      return (
        <div className="flex flex-col gap-1.5">
          <select
            disabled={saving}
            defaultValue={participant.github_repo_full_name ?? ""}
            onChange={(e) => e.target.value && selectRepo(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-black/10 bg-white px-2 py-1.5 text-sm dark:bg-black/20"
          >
            <option value="" disabled>
              Pick a repo…
            </option>
            {repos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {changing && (
            <button
              onClick={() => setChanging(false)}
              className="self-start text-xs opacity-60 hover:opacity-100"
            >
              Cancel
            </button>
          )}
        </div>
      );
    }
    // Already connected and just switching repos: the list is still loading
    // (repos === null), so show a loading state, never the "Connect a repo"
    // button — clicking that mid-flash would kick off a whole new OAuth
    // grant instead of just picking a different repo.
    if (changing) {
      return (
        <div className="flex items-center gap-2">
          <p className="text-sm opacity-60">Loading your repos…</p>
          <button onClick={() => setChanging(false)} className="text-xs opacity-60 hover:opacity-100">
            Cancel
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => startGithubRepoConnect(participant.id)}
        className="btn-fun bg-black/80 text-sm text-white"
      >
        🐙 Connect a repo
      </button>
    );
  }

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncGithubProgress(participant.id);
      onSynced?.();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="truncate opacity-70" title={participant.github_repo_full_name ?? undefined}>
        🐙 {participant.github_repo_full_name}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-fun bg-black/5 px-3 py-1 text-xs"
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
        <button onClick={() => setChanging(true)} className="text-xs opacity-60 hover:opacity-100">
          Change
        </button>
      </div>
    </div>
  );
}
