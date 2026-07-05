-- ============================================================
-- JAGGER OS · Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. profiles ─────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  phone      text,
  company    text,
  created_at timestamptz default now()
);

alter table public.profiles
  add column if not exists plan_type         text check (plan_type in ('ON-DEMAND','LITE','PRO','SCALE','FIXED')),
  add column if not exists status            text check (status in ('REGISTERED','ACTIVE')) default 'REGISTERED',
  add column if not exists line_id           text,
  add column if not exists telegram_webhook  text,
  add column if not exists notify_email      text;

-- ── 2. projects ─────────────────────────────────────────────
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  name       text not null,
  status     text default 'PENDING' check (status in ('PENDING','ACTIVE','ARCHIVED')),
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.projects enable row level security;
create policy "用戶可完全控制自身專案" on public.projects
  for all using (auth.uid() = user_id);

-- ── 3. contracts ────────────────────────────────────────────
drop table if exists public.contracts cascade;
create table public.contracts (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  status     text default 'PENDING' check (status in ('PENDING','SIGNED','TERMINATED')),
  metadata   jsonb default '{}'::jsonb,
  content    text,
  signed_at  timestamptz,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.contracts enable row level security;
create policy "用戶可檢視自身合約" on public.contracts
  for select using (auth.uid() = user_id);

-- ── 4. tasks ────────────────────────────────────────────────
drop table if exists public.tasks cascade;
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  description text,
  status      text default 'TODO' check (status in ('TODO','IN_PROGRESS','DONE')),
  ai_summary  text,
  due_date    timestamptz,
  created_at  timestamptz default timezone('utc', now()) not null
);

alter table public.tasks enable row level security;
create policy "用戶可完全控制自身任務" on public.tasks
  for all using (auth.uid() = user_id);

-- ── 5. files ────────────────────────────────────────────────
drop table if exists public.files cascade;
create table public.files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  name          text not null,
  drive_file_id text,
  mime_type     text,
  size          bigint,
  created_at    timestamptz default timezone('utc', now()) not null
);

alter table public.files enable row level security;
create policy "用戶可完全控制自身檔案" on public.files
  for all using (auth.uid() = user_id);
