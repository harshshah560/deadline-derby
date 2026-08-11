import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Props {
  projectId: string;
  onClose: () => void;
}

export function InviteModal({ projectId, onClose }: Props) {
  const [role, setRole] = useState<"racer" | "viewer">("racer");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    const { data, error } = await supabase
      .from("invites")
      .insert({ project_id: projectId, role })
      .select()
      .single();
    if (error || !data) return;
    setLink(`${window.location.origin}/invite/${data.token}`);
    setCopied(false);
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card-pop flex w-full max-w-sm flex-col gap-4 bg-white p-6 dark:bg-[#241b33]">
        <h3 className="font-display text-xl font-semibold">Invite someone 🎉</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setRole("racer")}
            className={`btn-fun flex-1 text-sm ${role === "racer" ? "bg-[var(--color-primary)] text-white" : "bg-black/5"}`}
          >
            🙌 Collaborator — works alongside you
          </button>
          <button
            onClick={() => setRole("viewer")}
            className={`btn-fun flex-1 text-sm ${role === "viewer" ? "bg-[var(--color-primary)] text-white" : "bg-black/5"}`}
          >
            👀 Viewer — just watches
          </button>
        </div>
        <button onClick={generate} className="btn-fun bg-[var(--color-accent)] text-white">
          Generate invite link
        </button>
        {link && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-black/5 p-2 text-xs">
            <input readOnly value={link} className="flex-1 bg-transparent outline-none" />
            <button onClick={copy} className="btn-fun bg-white px-3 py-1 text-xs">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
        <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100">
          Close
        </button>
      </div>
    </div>
  );
}
