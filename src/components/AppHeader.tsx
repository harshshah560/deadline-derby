import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AppHeader() {
  const { profile, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Link to="/" className="font-display text-2xl font-semibold flex items-center gap-2">
        <span className="sticker">🏁</span> Deadline Derby
      </Link>
      <div className="flex items-center gap-3">
        {profile && (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{ background: profile.avatar_color }}
            title={profile.username ?? ""}
          >
            {profile.avatar_emoji}
          </span>
        )}
        <button onClick={() => signOut()} className="text-sm opacity-70 hover:opacity-100">
          Sign out
        </button>
      </div>
    </header>
  );
}
