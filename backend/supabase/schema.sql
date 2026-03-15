-- AI API Documentation Generator schema
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  source_type text not null default 'unknown',
  spec_filename text,
  storage_path text,
  base_url text,
  endpoint_count integer not null default 0,
  summary text default '',
  share_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration safety for existing deployments where projects was created before user_id existed.
alter table public.projects
add column if not exists user_id uuid references auth.users(id) on delete cascade;

create table if not exists public.api_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  format text not null,
  filename text not null,
  storage_path text not null,
  raw_content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.parsed_endpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  endpoint_id uuid not null,
  method text not null,
  path text not null,
  group_name text not null default 'default',
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.generated_docs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  doc_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sdk_snippets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  endpoint_id uuid not null,
  language text not null,
  code text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_created_at on public.projects(created_at desc);
create index if not exists idx_projects_user_created_at on public.projects(user_id, created_at desc);
create index if not exists idx_projects_share_slug on public.projects(share_slug);
create index if not exists idx_api_specs_project_id on public.api_specs(project_id);
create index if not exists idx_parsed_endpoints_project_id on public.parsed_endpoints(project_id);
create index if not exists idx_generated_docs_project_id on public.generated_docs(project_id);
create index if not exists idx_sdk_snippets_project_id on public.sdk_snippets(project_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

-- Supabase Storage bucket for uploaded specifications.
insert into storage.buckets (id, name, public)
values ('spec-files', 'spec-files', false)
on conflict (id) do nothing;
