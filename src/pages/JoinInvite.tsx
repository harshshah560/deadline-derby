import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { AppHeader } from "../components/AppHeader";
import type { Invite, Project } from "../lib/database.types";

export function JoinInvite() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "joining" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .single()
      .then(async ({ data, error: inviteError }) => {
        if (inviteError || !data) {
          setError("This invite link isn't valid or has expired.");
          setStatus("error");
          return;
        }
        setInvite(data as Invite);
        const { data: proj } = await supabase.from("projects").select("*").eq("id", data.project_id).single();
        setProject(proj as Project | null);
        setStatus("ready");
      });
  }, [token]);

  const join = async () => {
    if (!invite || !user) return;
    setStatus("joining");
    const { error: joinError } = await supabase
      .from("participants")
      .upsert(
        { project_id: invite.project_id, user_id: user.id, role: invite.role },
        { onConflict: "project_id,user_id" },
      );
    if (joinError) {
      setError(joinError.message);
      setStatus("error");
      return;
    }
    navigate(`/project/${invite.project_id}`);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-6 pb-16 text-center">
        {status === "loading" && <p className="opacity-60">Loading invite…</p>}
        {status === "error" && <p className="text-red-500">{error}</p>}
        {(status === "ready" || status === "joining") && project && invite && (
          <div className="card-pop bg-white/80 p-8 dark:bg-white/10">
            <div className="sticker mb-3 text-5xl">{invite.role === "racer" ? "🏎️" : "👀"}</div>
            <h1 className="font-display text-2xl font-semibold">Join "{project.name}"</h1>
            <p className="mt-2 opacity-70">
              You've been invited as a {invite.role === "racer" ? "racer — you'll get your own track!" : "viewer."}
            </p>
            <button
              onClick={join}
              disabled={status === "joining"}
              className="btn-fun mt-5 bg-[var(--color-primary)] text-white"
            >
              {status === "joining" ? "Joining…" : "Join the race"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
