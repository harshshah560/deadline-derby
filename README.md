# Deadline Derby 🏁

A fun, Canva-style project planner. Describe a project and let AI draft the
checkpoints and tasks, watch them land on the calendar, plan day by day,
connect a GitHub repo for auto-progress, and invite people to collaborate or
just watch.

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

### 4. Enable "Plan with AI"

This calls the Anthropic API from a server-side Edge Function (the key never
reaches the browser):

```bash
supabase functions deploy generate-plan
supabase secrets set ANTHROPIC_API_KEY=...
```

### 5. Apply the Phase 1 PM schema

```bash
supabase db push   # or paste supabase/migrations/0002_pm.sql into the SQL Editor
```

### 6. Deploy

Push this repo to GitHub, then import it on [vercel.com](https://vercel.com) — it
auto-detects the Vite build. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
and `VITE_GITHUB_CLIENT_ID` as environment variables in the Vercel project
settings. Once deployed, add the production URL to both GitHub OAuth Apps'
callback URLs and to Supabase Auth's redirect allow-list.

## How it works

- **Projects** — each has a start/finish date and its own calendar; you can
  have as many as you want.
- **Plan with AI** — describe what you're building and Claude drafts a set of
  checkpoints (milestones) with tasks under each, which you can edit and
  refine before applying it to the calendar.
- **Checkpoints & tasks** — checkpoints are milestones pinned to a date
  (marked done manually or automatically from GitHub commit activity); tasks
  are day-level to-dos under a checkpoint and show up on their due date.
- **Day-by-day planning** — click any day on the calendar to see and add
  tasks/checkpoints due that day.
- **Team progress** — a lightweight progress bar and streak per collaborator,
  no racing required.
- **Comments** — a lightweight thread per checkpoint (and one project-wide),
  open to anyone who can see the project, including read-only viewers.
- **Invites** — invite people as a *collaborator* (can add progress/tasks) or
  a *viewer* (read-only, can still comment). A public share link also exists
  per project for read-only access with no account needed.

See `supabase/migrations/0001_init.sql` and `0002_pm.sql` for the full data
model and RLS rules.
