# Project History AI

Apple/Google 스타일의 프로젝트 히스토리 아카이브 웹앱입니다.

## 기능
- 상단 카테고리 카드
- 중앙 AI 질문 검색
- 하단 히스토리 등록
- 이미지 직접 업로드
- Supabase DB/Storage 저장
- OpenAI RAG 답변

## 배포 순서
1. Supabase 새 프로젝트 생성
2. Supabase SQL Editor에서 `supabase/schema.sql` 전체 실행
3. GitHub 새 저장소에 이 프로젝트 파일 업로드
4. Vercel에서 GitHub 저장소 Import
5. Vercel 환경변수 추가

```txt
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

`OPENAI_API_KEY`가 없으면 기록 저장은 가능하고 AI 답변만 비활성화됩니다.
