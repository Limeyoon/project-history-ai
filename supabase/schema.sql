create extension if not exists vector;

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  occurred_at date,
  category text default '기타',
  tags text[] default '{}',
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.record_images (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.record_chunks (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists record_chunks_embedding_idx
on public.record_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function public.match_record_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  similarity_threshold float default 0.05
)
returns table (
  record_id uuid,
  title text,
  chunk_text text,
  occurred_at date,
  category text,
  similarity float
)
language sql stable
as $$
  select
    r.id,
    r.title,
    c.chunk_text,
    r.occurred_at,
    r.category,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.record_chunks c
  join public.records r on r.id = c.record_id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

insert into storage.buckets (id, name, public)
values ('history-images', 'history-images', true)
on conflict (id) do update set public = true;

alter table public.records disable row level security;
alter table public.record_images disable row level security;
alter table public.record_chunks disable row level security;

grant usage on schema public to anon, authenticated;
grant all privileges on public.records to anon, authenticated;
grant all privileges on public.record_images to anon, authenticated;
grant all privileges on public.record_chunks to anon, authenticated;
grant execute on function public.match_record_chunks(vector, int, float) to anon, authenticated;
