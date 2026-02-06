create extension if not exists "pgcrypto";

create table if not exists installations (
  id text primary key,
  access_token text unique not null,
  timezone text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists tasks (
  id text primary key,
  installation_id text not null references installations(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('task', 'memo')),
  memo_category text,
  due_state text not null check (due_state in ('scheduled', 'no_due', 'pending_due')),
  due_at timestamptz,
  default_due_time_applied boolean not null default false,
  status text not null check (status in ('active', 'done')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists tasks_installation_idx on tasks(installation_id, updated_at desc);
create index if not exists tasks_due_idx on tasks(installation_id, due_state, due_at);

create table if not exists reminders (
  id text primary key,
  task_id text not null references tasks(id) on delete cascade,
  base_time timestamptz not null,
  offset_minutes integer not null,
  notify_at timestamptz not null,
  status text not null check (status in ('active', 'done', 'canceled')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists reminders_notify_idx on reminders(status, notify_at);

create table if not exists conversation_contexts (
  installation_id text primary key references installations(id) on delete cascade,
  pending_type text,
  candidate_task_ids text[] not null default '{}',
  proposed_due_at timestamptz,
  proposed_offset_minutes integer,
  expires_at timestamptz,
  payload jsonb not null default '{}',
  updated_at timestamptz not null
);

create table if not exists push_subscriptions (
  id text primary key,
  installation_id text not null references installations(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique(installation_id, endpoint)
);

create table if not exists chat_audit_logs (
  id text primary key,
  installation_id text not null references installations(id) on delete cascade,
  user_text text not null,
  assistant_text text not null,
  created_at timestamptz not null
);

create index if not exists chat_audit_installation_idx on chat_audit_logs(installation_id, created_at desc);
