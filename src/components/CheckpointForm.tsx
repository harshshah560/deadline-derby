import { type FormEvent, useState } from "react";
import type { ProgressSource } from "../lib/database.types";

interface Props {
  initialDate?: string;
  minDate: string;
  maxDate: string;
  hasGithubRepo: boolean;
  onCancel: () => void;
  onSubmit: (values: { title: string; targetDate: string; progressSource: ProgressSource }) => void;
}

export function CheckpointForm({ initialDate, minDate, maxDate, hasGithubRepo, onCancel, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState(initialDate ?? minDate);
  const [progressSource, setProgressSource] = useState<ProgressSource>("manual");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ title, targetDate, progressSource });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="card-pop flex w-full max-w-sm flex-col gap-4 bg-white p-6 dark:bg-[#241b33]"
      >
        <h3 className="font-display text-xl font-semibold">New checkpoint 🚩</h3>
        <label className="flex flex-col gap-1">
          <span className="font-display text-sm font-semibold">What's the milestone?</span>
          <input
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ship the login page"
            className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 dark:bg-black/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-sm font-semibold">Target date</span>
          <input
            required
            type="date"
            value={targetDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 dark:bg-black/20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-sm font-semibold">How does it get marked done?</span>
          <select
            value={progressSource}
            onChange={(e) => setProgressSource(e.target.value as ProgressSource)}
            className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 dark:bg-black/20"
          >
            <option value="manual">🎯 I'll mark it manually</option>
            <option value="github" disabled={!hasGithubRepo}>
              🐙 Auto from GitHub activity{!hasGithubRepo ? " (connect a repo first)" : ""}
            </option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="btn-fun bg-black/5">
            Cancel
          </button>
          <button type="submit" className="btn-fun bg-[var(--color-primary)] text-white">
            Add checkpoint
          </button>
        </div>
      </form>
    </div>
  );
}
