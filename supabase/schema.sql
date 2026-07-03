create extension if not exists pgcrypto;

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  occurred_at date,
  category text default '기타',
  tags text[] default '{}',
  image_urls text[] default '{}',
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('history-images', 'history-images', true)
on conflict (id) do update set public = true;

alter table public.records disable row level security;
grant usage on schema public to anon, authenticated;
grant all privileges on public.records to anon, authenticated;
