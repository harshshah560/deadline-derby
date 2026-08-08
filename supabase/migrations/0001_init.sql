-- Bingo-Cal schema: race calendars, checkpoints, participants, progress, invites.
-- Run via `supabase db push`, or paste into the Supabase Dashboard SQL Editor.

create extension if not exists pgcrypto;

-- 1. profiles ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_color text not null default '#FF6B6B',
  avatar_emoji text not null default '🐢',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are viewable by anyone authenticated or public"
  on profiles for select
  using (true);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile (with a random avatar) on first sign-in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  emojis text[] := array['🐢','🚗','🚀','🦄','🐸','🏃','🐇','🐙','🦖','🛴'];
  colors text[] := array['#FF6B6B','#4ECDC4','#FFD166','#A78BFA','#F472B6','#60A5FA','#34D399','#FB923C'];
begin
  insert into public.profiles (id, username, avatar_emoji, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    emojis[1 + floor(random() * array_length(emojis, 1))::int],
    colors[1 + floor(random() * array_length(colors, 1))::int]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. projects (a race calendar) ---------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  theme text not null default 'confetti',
  is_public boolean not null default false,
  share_token text not null unique default encode(gen_random_bytes(9), 'base64'),
  created_at timestamptz not null default now(),
  constraint valid_range check (end_date > start_date)
);

alter table projects enable row level security;

-- 3. checkpoints --------------------------------------------------------------
create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  target_date date not null,
  sort_order int not null default 0,
  progress_source text not null default 'manual' check (progress_source in ('manual', 'github')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table checkpoints enable row level security;

-- 4. participants --------------------------------------------------------------
create table participants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'racer', 'viewer')),
  github_repo_full_name text,
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

alter table participants enable row level security;

-- 5. checkpoint_completions ----------------------------------------------------
create table checkpoint_completions (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references checkpoints(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  completed_at timestamptz,
  completed_via text check (completed_via in ('manual', 'github_commit', 'github_pr', 'github_issue')),
  evidence_url text,
  unique (checkpoint_id, participant_id)
);

alter table checkpoint_completions enable row level security;

-- 6. github_connections (server-only; never exposed to the client) ------------
create table github_connections (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade unique,
  github_access_token text not null,
  github_username text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

alter table github_connections enable row level security;
-- Intentionally no policies: only the service_role key (used by Edge Functions)
-- bypasses RLS, so this table is unreachable from the browser/anon/authenticated roles.

-- 7. invites --------------------------------------------------------------------
create table invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  role text not null check (role in ('racer', 'viewer')),
  token text not null unique default encode(gen_random_bytes(9), 'base64'),
  created_by uuid references profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invites enable row level security;

-- Helper: can the current user see this project? (owner, participant, or public)
create or replace function public.can_view_project(pid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from projects p
    where p.id = pid
      and (
        p.is_public
        or p.owner_id = auth.uid()
        or exists (select 1 from participants pt where pt.project_id = pid and pt.user_id = auth.uid())
      )
  );
$$;

create or replace function public.is_project_owner(pid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from projects p where p.id = pid and p.owner_id = auth.uid());
$$;

-- projects policies
create policy "view projects you can see" on projects
  for select using (can_view_project(id));

create policy "owner creates projects" on projects
  for insert with check (owner_id = auth.uid());

create policy "owner updates their project" on projects
  for update using (owner_id = auth.uid());

create policy "owner deletes their project" on projects
  for delete using (owner_id = auth.uid());

-- checkpoints policies
create policy "view checkpoints of visible projects" on checkpoints
  for select using (can_view_project(project_id));

create policy "owner manages checkpoints" on checkpoints
  for insert with check (is_project_owner(project_id));

create policy "owner updates checkpoints" on checkpoints
  for update using (is_project_owner(project_id));

create policy "owner deletes checkpoints" on checkpoints
  for delete using (is_project_owner(project_id));

-- participants policies
create policy "view participants of visible projects" on participants
  for select using (can_view_project(project_id));

create policy "user joins as themselves" on participants
  for insert with check (user_id = auth.uid());

create policy "owner or self updates participant row" on participants
  for update using (is_project_owner(project_id) or user_id = auth.uid());

create policy "owner or self removes participant row" on participants
  for delete using (is_project_owner(project_id) or user_id = auth.uid());

-- checkpoint_completions policies
create policy "view completions of visible projects" on checkpoint_completions
  for select using (
    exists (
      select 1 from checkpoints c
      where c.id = checkpoint_completions.checkpoint_id
        and can_view_project(c.project_id)
    )
  );

create policy "racer marks their own progress" on checkpoint_completions
  for insert with check (
    exists (
      select 1 from participants pt
      join checkpoints c on c.id = checkpoint_completions.checkpoint_id
      where pt.id = checkpoint_completions.participant_id
        and pt.user_id = auth.uid()
        and pt.project_id = c.project_id
    )
    or exists (
      select 1 from checkpoints c
      where c.id = checkpoint_completions.checkpoint_id
        and is_project_owner(c.project_id)
    )
  );

create policy "racer or owner updates progress" on checkpoint_completions
  for update using (
    exists (
      select 1 from participants pt
      where pt.id = checkpoint_completions.participant_id
        and pt.user_id = auth.uid()
    )
    or exists (
      select 1 from checkpoints c
      where c.id = checkpoint_completions.checkpoint_id
        and is_project_owner(c.project_id)
    )
  );

-- invites policies
create policy "owner manages invites" on invites
  for all using (is_project_owner(project_id)) with check (is_project_owner(project_id));

create policy "anyone can look up an invite by token" on invites
  for select using (true);

-- Realtime: broadcast changes so racers see each other move live.
alter publication supabase_realtime add table checkpoint_completions;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table checkpoints;
