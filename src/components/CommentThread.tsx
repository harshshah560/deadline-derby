import { type FormEvent, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import type { Comment } from "../lib/database.types";

interface Props {
  projectId: string;
  checkpointId?: string;
  comments: Comment[];
  myParticipantId?: string;
  onPosted?: () => void;
}

export function CommentThread({ projectId, checkpointId, comments, myParticipantId, onPosted }: Props) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const thread = comments.filter((c) => (checkpointId ? c.checkpoint_id === checkpointId : !c.checkpoint_id));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!myParticipantId || !body.trim()) return;
    setPosting(true);
    await supabase.from("comments").insert({
      project_id: projectId,
      checkpoint_id: checkpointId ?? null,
      author_id: myParticipantId,
      body: body.trim(),
    });
    setBody("");
    setPosting(false);
    onPosted?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {thread.map((c) => (
          <li key={c.id} className="rounded-[var(--radius-md)] bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs opacity-60">
              <span>{c.author?.profile?.avatar_emoji}</span>
              <span className="font-semibold">{c.author?.profile?.username ?? "Someone"}</span>
              <span>· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
            </div>
            <p className="mt-1">{c.body}</p>
          </li>
        ))}
        {thread.length === 0 && <li className="text-xs opacity-50">No comments yet.</li>}
      </ul>
      {myParticipantId && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Say something…"
            className="flex-1 rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-1.5 text-sm dark:bg-black/20"
          />
          <button disabled={posting || !body.trim()} type="submit" className="btn-fun bg-black/5 text-xs">
            Post
          </button>
        </form>
      )}
    </div>
  );
}
