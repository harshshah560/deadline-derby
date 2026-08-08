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

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("*, participants!inner(user_id)")
      .eq("participants.user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProjects((data ?? []) as unknown as Project[]));
  }, [user]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold">Your race calendars</h1>
          <Link to="/new" className="btn-fun bg-[var(--color-primary)] text-white">
            + New race
          </Link>
        </div>

        {projects === null && <p className="opacity-60">Loading your races…</p>}

        {projects && projects.length === 0 && (
          <div className="card-pop bg-white/70 p-10 text-center dark:bg-white/10">
            <p className="mb-4 text-lg">No race calendars yet — start one!</p>
            <Link to="/new" className="btn-fun bg-[var(--color-primary)] text-white">
              Create your first race
            </Link>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((p) => {
            const daysLeft = differenceInCalendarDays(new Date(p.end_date), new Date());
            return (
              <Link
                key={p.id}
                to={`/project/${p.id}`}
                className="card-pop block bg-white/80 p-5 dark:bg-white/10"
              >
                <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm opacity-70">
                  {daysLeft >= 0 ? `${daysLeft} days left 🏎️` : "Finished 🏆"}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
