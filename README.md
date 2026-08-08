# Bingo-Cal 🏁

A fun, Canva-style calendar for racing your side projects to the finish line. Set
checkpoints, watch an animated avatar race across the calendar as you complete
them, connect a GitHub repo for auto-progress, and invite people to watch or
race alongside you.

Stack: React + Vite, Supabase (Postgres, Auth, Realtime, Edge Functions), deployed on Vercel.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public** key
   into `.env.local` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. Install the Supabase CLI (`npm install -g supabase`), then:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
4. Apply the schema in `supabase/migrations/0001_init.sql` — either
   `supabase db push`, or paste the file into the Dashboard's **SQL Editor** and
   run it (simplest for a first pass).

### 2. Enable "Sign in with GitHub" (app login)

In GitHub, go to **Settings → Developer settings → OAuth Apps → New OAuth App**.
Set the callback URL to whatever the Supabase Dashboard shows you under
**Auth → Providers → GitHub** (looks like `https://<ref>.supabase.co/auth/v1/callback`).
Paste that app's client ID/secret into the Supabase dashboard there and enable the provider.

### 3. Enable "connect a repo" (progress tracking)

This needs a **second, separate** GitHub OAuth App — it stores its own
long-lived access token per participant, kept server-side only.

1. Create another OAuth App in GitHub. Callback URL:
   `https://<ref>.supabase.co/functions/v1/github-oauth-callback`.
2. Put its client ID into `.env.local` as `VITE_GITHUB_CLIENT_ID`.
3. Deploy the Edge Functions and set the server-side secret:
   ```bash
   supabase functions deploy github-oauth-callback --no-verify-jwt
   supabase functions deploy github-sync
   supabase secrets set GITHUB_CLIENT_ID=... GITHUB_CLIENT_SECRET=...
   ```

### 4. Deploy

Push this repo to GitHub, then import it on [vercel.com](https://vercel.com) — it
auto-detects the Vite build. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
and `VITE_GITHUB_CLIENT_ID` as environment variables in the Vercel project
settings. Once deployed, add the production URL to both GitHub OAuth Apps'
callback URLs and to Supabase Auth's redirect allow-list.

## How it works

- **Race calendars** — each project you create is its own calendar with a
  start/finish date; you can have as many as you want.
- **Checkpoints** — milestones pinned to a date, marked done manually or
  automatically from GitHub commit activity.
- **The race** — an SVG track snakes across the calendar weeks; each racer's
  avatar sits at their furthest completed checkpoint.
- **Invites** — invite people as a *racer* (their own avatar/track on your
  calendar) or a *viewer* (read-only). A public share link also exists per
  project for read-only access with no account needed.

See `supabase/migrations/0001_init.sql` for the full data model and RLS rules.
