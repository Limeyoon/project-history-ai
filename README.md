# Project History AI (아카이브)

3년간의 프로젝트 기록을 누구나 접속 가능한 링크로 공유하고, **카테고리별 카드 + 키워드 검색**으로
바로 찾아볼 수 있는 웹앱입니다.
지금 버전은 **AI 챗봇(RAG) 없이** 등록된 기록을 검색하는 기능까지만 포함합니다.
(구조는 나중에 AI 질의응답을 붙이기 쉽게 만들어 두었습니다 — 아래 "다음 단계" 참고)

## 카테고리 커스터마이징

메인 화면 상단의 5개 카드(자주 질문하는 디자인 시스템 / 광고주 예외 케이스 / 폰트 / 개발 / 기타)는
`lib/categories.js` 한 파일에서 정의합니다. 라벨, 설명, 아이콘, 색상을 프로젝트에 맞게 자유롭게
바꾸거나 개수를 늘리고 줄일 수 있습니다. 기록을 등록할 때(`/admin`) 이 목록에서 카테고리를 선택합니다.

- 기록은 브라우저가 아니라 **Supabase(공유 데이터베이스)** 에 저장됩니다.
  → 링크를 아는 누구나 같은 데이터를 보고 검색할 수 있습니다.
- 배포는 **Vercel**, 코드 관리는 **GitHub**을 사용합니다.

---

## 1. Supabase 프로젝트 만들기 (5분)

1. https://supabase.com 에서 로그인 후 **New project** 생성
2. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** 클릭
3. 이 저장소의 `supabase/schema.sql` 파일 내용을 복사해서 붙여넣고 **Run** 실행
   → `history_entries` 테이블이 생성됩니다.
   → 이미 이전 버전으로 테이블을 만들어서 `category` 컬럼만 추가하면 되는 경우,
     `schema.sql` 맨 아래 주석 처리된 `alter table ... add column ...` 한 줄만 실행하세요.
4. 왼쪽 메뉴 **Project Settings → API** 로 이동해서 아래 3개 값을 복사해두세요.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 절대 외부에 공개하면 안 됩니다)

## 2. 로컬에서 실행해보기 (선택)

```bash
npm install
cp .env.local.example .env.local
# .env.local 파일을 열어 위에서 복사한 값들을 채워넣으세요.
# ADMIN_PASSWORD 도 원하는 값으로 설정하세요. (기록 등록/삭제 시 사용)
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 아카이브 화면
http://localhost:3000/admin 접속 → 기록 등록 화면 (ADMIN_PASSWORD 입력 필요)

## 3. GitHub에 올리기

```bash
git init
git add .
git commit -m "project archive site"
git branch -M main
git remote add origin <내 GitHub 저장소 주소>
git push -u origin main
```

`.env.local`은 `.gitignore`에 포함되어 있어 GitHub에는 올라가지 않습니다. (안전)

## 4. Vercel에 배포하기

1. https://vercel.com 에서 **Add New → Project**
2. 방금 올린 GitHub 저장소를 선택하고 **Import**
3. **Environment Variables** 섹션에 아래 4개를 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
4. **Deploy** 클릭 → 몇 분 후 `https://프로젝트이름.vercel.app` 형태의 공개 URL이 생성됩니다.

이 URL을 아는 누구나 아카이브를 보고 검색할 수 있습니다.
`/admin` 경로에서는 비밀번호를 아는 사람만 기록을 등록/삭제할 수 있습니다.

> 이후 코드를 수정해서 `git push` 하면 Vercel이 자동으로 재배포합니다.

---

## 사용 방법

- **기록 등록**: `/admin` 접속 → 비밀번호 입력 → 날짜/제목/내용/태그 입력 후 등록
- **검색**: 메인 페이지(`/`)에서 검색창에 키워드 입력 시 제목·내용·태그를 기준으로 즉시 필터링됩니다.
- **연도별 보기**: 왼쪽 사이드바에서 연도를 클릭하면 해당 연도 기록만 표시됩니다.

---

## 다음 단계: AI 챗봇(RAG) 붙이기

지금 구조에서 `history_entries` 테이블이 이미 근거 자료 저장소 역할을 합니다.
나중에 여유가 생기면 다음 순서로 RAG 챗봇을 추가할 수 있습니다.

1. `/pages/api/chat.js` 라우트 추가
2. 사용자 질문이 들어오면 `history_entries`에서 관련 기록을 검색 (키워드 검색 또는 임베딩 기반 유사도 검색)
3. 검색된 기록만 근거로 Claude API에 전달 → "근거 안에서만 답하고, 근거가 없으면 모른다고 답할 것" 이라는 지침과 함께 요청
4. 응답을 프론트엔드 채팅 UI에 표시

이 구조라면 지금 쌓아가는 기록이 그대로 RAG의 근거 자료가 되므로, 데이터 입력은 지금부터 시작해도 됩니다.

---

## 파일 구조

```
pages/
  index.js         # 공개 아카이브 + 검색 화면
  admin.js          # 기록 등록/삭제 화면 (비밀번호 보호)
  api/records.js    # 기록 조회(GET, 공개) / 등록(POST) / 삭제(DELETE, 관리자 전용)
lib/
  supabaseClient.js  # 브라우저용 (anon key)
  supabaseAdmin.js   # 서버 전용 (service_role key, API 라우트에서만 사용)
supabase/
  schema.sql         # 테이블 생성 스크립트
styles/globals.css   # 전체 디자인
```
