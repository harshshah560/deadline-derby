import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { LoginScreen } from "./LoginScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-2xl font-display">
        Loading… 🚀
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
