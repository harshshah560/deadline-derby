// Exchanges the GitHub OAuth "connect a repo" code for an access token and
// stores it server-side. Deployed with `--no-verify-jwt` because GitHub
// redirects the browser here directly, with no Supabase session header.
//
// Env vars (set via `supabase secrets set`):
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided by Supabase)
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");

  if (!code || !stateRaw) {
    return new Response("Missing code or state", { status: 400 });
  }

  let state: { participantId: string; returnTo: string };
  try {
    state = JSON.parse(decodeURIComponent(stateRaw));
  } catch {
    return new Response("Invalid state", { status: 400 });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("GITHUB_CLIENT_ID"),
      client_secret: Deno.env.get("GITHUB_CLIENT_SECRET"),
      code,
    }),
  });
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  if (!accessToken) {
    return new Response(`GitHub token exchange failed: ${JSON.stringify(tokenJson)}`, { status: 400 });
  }

  const ghUserRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "bingo-cal" },
  });
  const ghUser = await ghUserRes.json();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await supabaseAdmin.from("github_connections").upsert(
    {
      participant_id: state.participantId,
      github_access_token: accessToken,
      github_username: ghUser.login ?? null,
      last_synced_at: null,
    },
    { onConflict: "participant_id" },
  );

  return new Response(null, {
    status: 302,
    headers: { Location: state.returnTo },
  });
});
