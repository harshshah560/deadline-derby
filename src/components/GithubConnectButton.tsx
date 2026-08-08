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
        <div className="flex items-center gap-2">
          <select
            disabled={saving}
            defaultValue={participant.github_repo_full_name ?? ""}
            onChange={(e) => e.target.value && selectRepo(e.target.value)}
            className="rounded-[var(--radius-md)] border border-black/10 bg-white px-2 py-1 text-sm dark:bg-black/20"
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
            <button onClick={() => setChanging(false)} className="text-xs opacity-60 hover:opacity-100">
              Cancel
            </button>
          )}
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
    <div className="flex items-center gap-2 text-sm">
      <span className="opacity-70">🐙 {participant.github_repo_full_name}</span>
      <button onClick={handleSync} disabled={syncing} className="btn-fun bg-black/5 text-xs">
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      <button onClick={() => setChanging(true)} className="text-xs opacity-60 hover:opacity-100">
        Change
      </button>
    </div>
  );
}
