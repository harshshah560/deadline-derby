import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addMonths, format } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { AppHeader } from "../components/AppHeader";

export function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({ owner_id: user.id, name, start_date: startDate, end_date: endDate })
      .select()
      .single();

    if (projectError || !project) {
      setError(projectError?.message ?? "Could not create project.");
      setSaving(false);
      return;
    }

    const { error: participantError } = await supabase
      .from("participants")
      .insert({ project_id: project.id, user_id: user.id, role: "owner" });

    if (participantError) {
      setError(participantError.message);
      setSaving(false);
      return;
    }

    navigate(`/project/${project.id}`);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-lg px-6 pb-16">
        <h1 className="font-display mb-6 text-3xl font-semibold">Start a new project 🚀</h1>
        <form onSubmit={handleSubmit} className="card-pop flex flex-col gap-4 bg-white/80 p-6 dark:bg-white/10">
          <label className="flex flex-col gap-1">
            <span className="font-display text-sm font-semibold">Project name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ship my side project"
              className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 dark:bg-black/20"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-display text-sm font-semibold">Start date</span>
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 dark:bg-black/20"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-display text-sm font-semibold">Finish date</span>
              <input
                required
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 dark:bg-black/20"
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={saving} type="submit" className="btn-fun bg-[var(--color-primary)] text-white">
            {saving ? "Setting up…" : "Create project"}
          </button>
        </form>
      </main>
    </div>
  );
}
