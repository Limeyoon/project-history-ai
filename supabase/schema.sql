create extension if not exists pgcrypto;

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  occurred_at date,
  category text,
  tags text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.record_images (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('history-images', 'history-images', true)
on conflict (id) do update set public = true;

alter table public.records disable row level security;
alter table public.record_images disable row level security;

grant usage on schema public to anon, authenticated;
grant all privileges on public.records to anon, authenticated;
grant all privileges on public.record_images to anon, authenticated;
