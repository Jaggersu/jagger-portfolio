-- ============================================================
-- JAGGER OS · Supabase Schema v2
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. profiles ─────────────────────────────────────────────
-- profiles.id = auth.uid() (Supabase Auth user ID)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  phone      text,
  company    text,
  plan_type  text check (plan_type in ('ON-DEMAND','LITE','PRO','SCALE','FIXED')),
  status     text check (status in ('REGISTERED','ACTIVE')) default 'REGISTERED',
  role       text not null default 'client' check (role in ('client','admin')),
  line_id    text,
  telegram_webhook text,
  notify_email     text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "read_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );
create policy "write_own" on public.profiles
  for all using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. projects ─────────────────────────────────────────────
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  name       text not null,
  status     text default 'PENDING' check (status in ('PENDING','ACTIVE','ARCHIVED')),
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.projects enable row level security;
drop policy if exists "用戶可完全控制自身專案" on public.projects;
create policy "用戶可完全控制自身專案" on public.projects
  for all using (auth.uid() = user_id);
drop policy if exists "admin可讀寫所有專案" on public.projects;
create policy "admin可讀寫所有專案" on public.projects
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- ── 3. contracts ────────────────────────────────────────────
create table if not exists public.contracts (
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
drop policy if exists "用戶可檢視自身合約" on public.contracts;
create policy "用戶可檢視自身合約" on public.contracts
  for select using (auth.uid() = user_id);
drop policy if exists "admin可讀寫所有合約" on public.contracts;
create policy "admin可讀寫所有合約" on public.contracts
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- ── 4. tasks ────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  task_code   text,
  title       text not null,
  description text,
  status      text default 'QUEUED' check (status in ('QUEUED','IN_PROGRESS','REVIEW','DELIVERED')),
  type        text default 'GENERAL',
  priority    text default 'MED' check (priority in ('HIGH','MED','LOW')),
  eta         text,
  ai_summary  text,
  due_date    timestamptz,
  created_at  timestamptz default timezone('utc', now()) not null
);

alter table public.tasks enable row level security;
drop policy if exists "用戶可完全控制自身任務" on public.tasks;
create policy "用戶可完全控制自身任務" on public.tasks
  for all using (auth.uid() = user_id);
drop policy if exists "admin可讀寫所有任務" on public.tasks;
create policy "admin可讀寫所有任務" on public.tasks
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- 啟用 tasks 與 contracts 表的 Realtime 變更訂閱
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.contracts;

-- ── 5. files ────────────────────────────────────────────────
create table if not exists public.files (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  file_name       text not null,
  file_url        text,
  storage_path    text,
  google_drive_id text,
  mime_type       text,
  size            bigint default 0,
  created_at      timestamptz default timezone('utc', now()) not null
);

alter table public.files enable row level security;
drop policy if exists "用戶可完全控制自身檔案" on public.files;
create policy "用戶可完全控制自身檔案" on public.files
  for all using (auth.uid() = user_id);
