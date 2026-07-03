-- Supabase SQL Editor에서 이 스크립트를 실행하세요.

create extension if not exists "pgcrypto";

create table if not exists history_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  category text not null default '기타',
  title text not null,
  content text not null,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists history_entries_date_idx on history_entries (entry_date desc);
create index if not exists history_entries_category_idx on history_entries (category);

-- 기존에 이미 history_entries 테이블을 만든 경우, 아래 한 줄만 실행해서 category 컬럼만 추가하세요.
-- alter table history_entries add column if not exists category text not null default '기타';

alter table history_entries enable row level security;

-- 누구나 읽기 가능 (공개 아카이브)
create policy "Public read access"
  on history_entries
  for select
  using (true);

-- 쓰기(등록/수정/삭제)는 클라이언트에서 직접 하지 않음.
-- /api/records 서버 라우트가 service_role 키로만 접근하며,
-- ADMIN_PASSWORD로 보호됩니다. 별도의 insert/update/delete 정책은 만들지 않습니다.
