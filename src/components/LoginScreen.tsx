import { useAuth } from "../hooks/useAuth";

export function LoginScreen() {
  const { signInWithGitHub } = useAuth();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="sticker text-6xl">🏁</div>
      <h1 className="font-display text-4xl font-semibold">Race your projects to the finish line</h1>
      <p className="max-w-md text-lg opacity-80">
        Set checkpoints, connect GitHub, and race friends across a calendar. Silly graphics, real
        accountability.
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
