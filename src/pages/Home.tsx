import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import type { Project } from "../lib/database.types";

export function Home() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);

  const reload = () => {
    if (!user) return;
    supabase
      .from("projects")
      .select("*, participants!inner(user_id)")
      .eq("participants.user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as unknown as Project[]));
  };

  useEffect(reload, [user]);

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"? This removes its checkpoints, tasks, and progress for everyone. This can't be undone.`)) {
      return;
    }
    await supabase.from("projects").delete().eq("id", project.id);
    reload();
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold">Your projects</h1>
          <Link to="/new" className="btn-fun bg-[var(--color-primary)] text-white">
            + New project
          </Link>
        </div>

        {projects === null && <p className="opacity-60">Loading your projects…</p>}

        {projects && projects.length === 0 && (
          <div className="card-pop bg-white/70 p-10 text-center dark:bg-white/10">
            <p className="mb-4 text-lg">No projects yet — start one!</p>
            <Link to="/new" className="btn-fun bg-[var(--color-primary)] text-white">
              Create your first project
            </Link>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((p) => {
            const daysLeft = differenceInCalendarDays(new Date(p.end_date), new Date());
            return (
              <div key={p.id} className="card-pop relative block bg-white/80 p-5 dark:bg-white/10">
                <Link to={`/project/${p.id}`} className="block">
                  <h2 className="font-display text-xl font-semibold pr-6">{p.name}</h2>
                  <p className="mt-1 text-sm opacity-70">
                    {daysLeft >= 0 ? `${daysLeft} days left ⏳` : "Finished 🏆"}
                  </p>
                </Link>
                {p.owner_id === user?.id && (
                  <button
                    onClick={() => handleDelete(p)}
                    title="Delete project"
                    className="absolute top-4 right-4 text-sm opacity-40 hover:opacity-100 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
