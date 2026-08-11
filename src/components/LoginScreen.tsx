import { useAuth } from "../hooks/useAuth";

export function LoginScreen() {
  const { signInWithGitHub } = useAuth();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="sticker text-6xl">🚀</div>
      <h1 className="font-display text-4xl font-semibold">Plan it, ship it, don't do it alone</h1>
      <p className="max-w-md text-lg opacity-80">
        Sketch a plan with AI, break it into checkpoints and tasks, watch it land on the calendar, and
        bring friends along for the ride. Real accountability, still a little fun.
      </p>
      <button
        onClick={signInWithGitHub}
        className="btn-fun bg-[var(--color-ink)] text-white text-lg"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}
