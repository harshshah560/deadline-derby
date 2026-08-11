-- Phase 1 of the PM rework: tasks under checkpoints, and lightweight comments.
-- Run via `supabase db push`, or paste into the Supabase Dashboard SQL Editor.

-- 1. tasks -------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references checkpoints(id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'done')),
  sort_order int not null default 0,
  assigned_participant_id uuid references participants(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table tasks enable row level security;

-- Helper: which project does a task belong to, via its checkpoint?
create or replace function public.can_view_task(cp_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from checkpoints c
    where c.id = cp_id and can_view_project(c.project_id)
  );
$$;

create policy "view tasks of visible projects" on tasks
  for select using (can_view_task(checkpoint_id));

create policy "owner creates tasks" on tasks
  for insert with check (
    exists (select 1 from checkpoints c where c.id = checkpoint_id and is_project_owner(c.project_id))
  );

create policy "owner or assignee updates tasks" on tasks
  for update using (
    exists (select 1 from checkpoints c where c.id = checkpoint_id and is_project_owner(c.project_id))
    or exists (
      select 1 from participants pt
      where pt.id = tasks.assigned_participant_id and pt.user_id = auth.uid()
    )
  );

create policy "owner deletes tasks" on tasks
  for delete using (
    exists (select 1 from checkpoints c where c.id = checkpoint_id and is_project_owner(c.project_id))
  );

-- 2. comments ------------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  checkpoint_id uuid references checkpoints(id) on delete cascade,
  author_id uuid not null references participants(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table comments enable row level security;

create policy "view comments of visible projects" on comments
  for select using (can_view_project(project_id));

-- Any participant (owner, racer, or viewer) can comment on a project they can see.
create policy "participants comment on visible projects" on comments
  for insert with check (
    can_view_project(project_id)
    and exists (select 1 from participants pt where pt.id = author_id and pt.user_id = auth.uid())
  );

-- Realtime: task/comment changes should show up live like checkpoints already do.
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;
