# Project History AI - Search Version

AI 없이 먼저 동작하는 프로젝트 히스토리 아카이브입니다.

## 기능
- 상단 카테고리 카드
- 중앙 일반 검색: 제목/내용/카테고리/태그 검색
- 하단 히스토리 등록
- 참조 이미지 업로드
- Supabase DB + Storage 사용
- OpenAI API Key 불필요

## Vercel 환경변수

```txt
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_or_service_role_key
```

## Supabase 설정
Supabase SQL Editor에서 `supabase/schema.sql` 전체를 실행하세요.
RLS 경고가 뜨면 `Run without RLS`로 실행해도 됩니다.
