import { supabase } from "./supabaseClient";

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;

// Starts the "connect a repo for progress tracking" OAuth flow. This is a
// separate GitHub OAuth App from the one Supabase Auth uses for login (see
// README / plan) because it needs its own stored, refreshable access token
// per participant, exchanged server-side by the github-oauth-callback Edge Function.
export function startGithubRepoConnect(participantId: string) {
  if (!GITHUB_CLIENT_ID) {
    alert("GitHub repo connection isn't configured yet (missing VITE_GITHUB_CLIENT_ID).");
    return;
  }
  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-oauth-callback`;
  const state = encodeURIComponent(JSON.stringify({ participantId, returnTo: window.location.href }));
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "repo");
  url.searchParams.set("state", state);
  window.location.href = url.toString();
}

export async function listMyGithubRepos(participantId: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("github-sync", {
    body: { action: "list_repos", participantId },
  });
  if (error) throw error;
  return (data?.repos ?? []) as string[];
}

export async function syncGithubProgress(participantId: string) {
  const { data, error } = await supabase.functions.invoke("github-sync", {
    body: { action: "sync", participantId },
  });
  if (error) throw error;
  return data;
}
