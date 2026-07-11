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

create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

alter table public.profiles enable row level security;
drop policy if exists "read_own_or_admin" on public.profiles;
create policy "read_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id
    or public.current_user_role() = 'admin'
  );
drop policy if exists "write_own" on public.profiles;
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
    public.current_user_role() = 'admin'
  );

-- ── 3. contracts ────────────────────────────────────────────
create table if not exists public.contracts (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid references public.projects(id) on delete cascade not null,
  user_id            uuid references public.profiles(id) on delete cascade not null,
  status             text default 'PENDING' check (status in ('PENDING','SIGNED','TERMINATED')),
  metadata           jsonb default '{}'::jsonb,
  content            text,
  raw_contract_body  text,
  signature_snapshot text,
  signed_at          timestamptz,
  created_at         timestamptz default timezone('utc', now()) not null
);

alter table public.contracts enable row level security;
drop policy if exists "用戶可檢視自身合約" on public.contracts;
drop policy if exists "admin可讀寫所有合約" on public.contracts;

-- 1. SELECT 政策
create policy "允許讀取合約" on public.contracts
  for select using (
    auth.uid() = user_id or public.current_user_role() = 'admin'
  );

-- 2. INSERT 政策
create policy "允許建立合約" on public.contracts
  for insert with check (
    public.current_user_role() = 'admin'
  );

-- 3. UPDATE 政策（僅限狀態為 PENDING 時）
create policy "允許用戶簽署合約" on public.contracts
  for update using (
    auth.uid() = user_id and status = 'PENDING'
  ) with check (
    auth.uid() = user_id and status in ('PENDING', 'SIGNED')
  );

create policy "允許管理員修改未簽署合約" on public.contracts
  for update using (
    public.current_user_role() = 'admin' and status = 'PENDING'
  ) with check (
    public.current_user_role() = 'admin' and status in ('PENDING', 'SIGNED')
  );

-- 4. DELETE 政策（僅限狀態為 PENDING 且為管理員）
create policy "允許管理員刪除未簽署合約" on public.contracts
  for delete using (
    public.current_user_role() = 'admin' and status = 'PENDING'
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
    public.current_user_role() = 'admin'
  );

-- 啟用 tasks 與 contracts 表的 Realtime 變更訂閱（idempotent）
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contracts') then
    alter publication supabase_realtime add table public.contracts;
  end if;
end $$;

-- ── 6. task_activities ────────────────────────────────────────
create table if not exists public.task_activities (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  created_at  timestamptz default timezone('utc', now()) not null
);

alter table public.task_activities enable row level security;
drop policy if exists "用戶可讀寫自身任務活動" on public.task_activities;
create policy "用戶可讀寫自身任務活動" on public.task_activities
  for all using (
    exists (
      select 1 from public.tasks where id = task_activities.task_id and user_id = auth.uid()
    )
  );
drop policy if exists "admin可讀寫所有任務活動" on public.task_activities;
create policy "admin可讀寫所有任務活動" on public.task_activities
  for all using (
    public.current_user_role() = 'admin'
  );

-- ── 7. task_comments ────────────────────────────────────────
create table if not exists public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.tasks(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  is_admin    boolean default false,
  created_at  timestamptz default timezone('utc', now()) not null
);

alter table public.task_comments enable row level security;
drop policy if exists "用戶可讀寫自身任務留言" on public.task_comments;
create policy "用戶可讀寫自身任務留言" on public.task_comments
  for all using (
    auth.uid() = user_id
    or exists (
      select 1 from public.tasks where id = task_comments.task_id and user_id = auth.uid()
    )
  );
drop policy if exists "admin可讀寫所有任務留言" on public.task_comments;
create policy "admin可讀寫所有任務留言" on public.task_comments
  for all using (
    public.current_user_role() = 'admin'
  );

-- 啟用 task_activities 與 task_comments 的 Realtime（idempotent）
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_activities') then
    alter publication supabase_realtime add table public.task_activities;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_comments') then
    alter publication supabase_realtime add table public.task_comments;
  end if;
end $$;

-- ── 8. files ────────────────────────────────────────────────
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
drop policy if exists "admin可讀寫所有檔案" on public.files;
create policy "admin可讀寫所有檔案" on public.files
  for all using (
    public.current_user_role() = 'admin'
  );

-- ── 9. google drive folder migrations ─────────────────────────
alter table public.profiles add column if not exists google_drive_folder_id text;
alter table public.projects add column if not exists google_drive_folder_id text;
alter table public.projects add column if not exists drive_upload_url text;
alter table public.projects add column if not exists drive_view_url text;
alter table public.projects add column if not exists google_drive_folder_url text;

-- ── 10. project_requests ──────────────────────────────────────
create table if not exists public.project_requests (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid references public.projects(id) on delete cascade not null,
  client_id             uuid references public.profiles(id) on delete cascade not null,
  title                 text not null,
  description           text,
  ai_title              text,
  ai_structured_content jsonb default '{}'::jsonb,
  drive_file_urls       jsonb default '[]'::jsonb,
  status                text default '審核中' check (status in ('審核中','已轉任務','已婉拒')),
  is_read               boolean default false,
  created_at            timestamptz default now() not null
);

alter table public.project_requests add column if not exists is_read boolean default false;

alter table public.project_requests enable row level security;

drop policy if exists "允許讀取需求" on public.project_requests;
create policy "允許讀取需求" on public.project_requests
  for select using (
    auth.uid() = client_id or public.current_user_role() = 'admin'
  );

drop policy if exists "允許客戶建立需求" on public.project_requests;
create policy "允許客戶建立需求" on public.project_requests
  for insert with check (
    auth.uid() = client_id
  );

drop policy if exists "允許更新需求" on public.project_requests;
create policy "允許更新需求" on public.project_requests
  for update using (
    (auth.uid() = client_id and status = '審核中') or public.current_user_role() = 'admin'
  ) with check (
    (auth.uid() = client_id and status = '審核中') or public.current_user_role() = 'admin'
  );

drop policy if exists "允許管理員刪除需求" on public.project_requests;
create policy "允許管理員刪除需求" on public.project_requests
  for delete using (
    public.current_user_role() = 'admin'
  );

