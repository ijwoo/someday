# Someday — 작업 내용

## 개요
"언젠가 가야지 했던 곳들, 이제 진짜 가봐요" — 사진 속 장소를 AI가 인식해 여행 코스를 자동 생성하는 모바일 웹앱.

---

## 폴더 구조

```
someday/
├── app/
│   ├── layout.tsx          # 루트 레이아웃 (폰트, 메타데이터)
│   ├── page.tsx            # 홈 (스플래시 → 온보딩 → 홈)
│   ├── globals.css         # 디자인 토큰 + 전역 스타일
│   ├── upload/
│   │   └── page.tsx        # 사진 업로드 · AI 분석 · 지역 선택
│   ├── plan/
│   │   └── page.tsx        # 코스 타임라인 · 지도 · 공유
│   └── api/
│       ├── analyze/route.ts    # POST /api/analyze — Claude Vision
│       ├── course/route.ts     # POST /api/course  — 코스 생성
│       └── places/route.ts     # POST /api/places  — Kakao 장소 검색
│
├── components/
│   ├── SceneCanvas.tsx     # Canvas 풍경 페인터 (공통 컴포넌트)
│   ├── StatusBar.tsx       # 상단 상태바 (시계)
│   ├── Toast.tsx           # 토스트 알림 (CustomEvent 기반)
│   ├── Loading.tsx         # 로딩 오버레이
│   └── BottomNav.tsx       # 하단 내비게이션
│
├── lib/
│   ├── api.ts              # 클라이언트 API 유틸 (extractGPS, analyzePhoto, ...)
│   ├── exif.ts             # GPS EXIF 추출 (exifr 래퍼)
│   ├── claude.ts           # Anthropic API — Vision + 코스 생성
│   ├── kakao.ts            # Kakao Maps API — 역지오코딩 + 주변 장소
│   └── cache.ts            # LRU 캐시 (좌표 기반, 24시간)
│
├── types/
│   └── index.ts            # 공유 TypeScript 타입
│
├── .env.local.example      # 환경변수 예시
└── WORK.md                 # 이 파일
```

---

## 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| 스플래시 | `/` | 앱 최초 진입 시 2.2초 표시 |
| 온보딩 | `/` (내부 상태) | 첫 방문 시 3슬라이드 온보딩 |
| 홈 | `/` | 버킷리스트 클러스터 + 최근 코스 |
| 업로드 | `/upload` | 사진 그리드 + AI 분석 + 지역 선택 |
| 플랜 | `/plan` | 코스 타임라인 (Day 탭) |
| 지도 | `/plan` (map 탭) | 핀 지도 + 하단 스팟 시트 |
| 공유 | `/plan` (share 탭) | 코스 미리보기 + 앱 다운로드 CTA |

---

## 주요 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2.3 (App Router) |
| 언어 | TypeScript 5 |
| UI | React 19.2 + 인라인 스타일 + CSS 변수 |
| 스타일 | Tailwind CSS v4 (`@import 'tailwindcss'`) |
| 폰트 | DM Serif Display · Noto Sans KR (next/font/google) |
| AI | Anthropic Claude Haiku 4.5 (Vision + Text) |
| 지도 | Kakao Maps REST API |
| EXIF | exifr (GPS 좌표 추출) |
| 캐시 | lru-cache (서버, 24시간 TTL) |

---

## 데이터 흐름

```
사진 업로드
  └─ EXIF GPS 있음  → /api/places (Kakao 역지오코딩 + 주변 검색)
  └─ GPS 없음       → /api/analyze (Claude Vision으로 장소 인식)
                         └─ /api/places

지역 선택
  └─ /api/course (Claude로 최적 코스 생성)
  └─ sessionStorage에 저장
  └─ /plan 으로 이동
```

---

## 환경변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 키를 입력하세요.

```bash
cp .env.local.example .env.local
```

| 변수 | 설명 | 발급처 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | Claude API 키 | console.anthropic.com |
| `KAKAO_REST_API_KEY` | Kakao REST API 키 | developers.kakao.com |

> **API 키 없이도 동작합니다.** 키가 없으면 업로드 페이지에서 지역 선택 시 내장된 데모 코스 데이터(`DEMO_COURSE`)를 사용합니다.

---

## 실행

```bash
npm install
cp .env.local.example .env.local
# .env.local에 API 키 입력 (선택사항)
npm run dev
```

브라우저에서 `http://localhost:3000` 접속. 배경이 연보라색(`#a8c0ff`)이고 중앙에 390×844 폰 프레임이 표시됩니다.

---

## 디자인 시스템

`app/globals.css`에 정의된 CSS 변수:

```css
--blue: #3b7ef8    /* 메인 블루 */
--text: #0f1b3d    /* 본문 */
--text3: #9aa5c0   /* 힌트/서브 */
--bg: #f0f4ff      /* 배경 */
--r: 20px          /* 기본 라운드 */
--sh: ...          /* 그림자 */
```

**SceneCanvas 컴포넌트**: `seed`와 `themeIndex`(0~4)를 받아 산·달·별이 있는 풍경을 Canvas에 그립니다. 동일한 seed/theme 조합은 항상 같은 그림을 생성합니다.

---

## Next.js 16 대응 사항

- `params` / `searchParams` 비동기 처리 (해당 없음 — 동적 라우트 미사용)
- `middleware.ts` → `proxy.ts` 미사용
- Turbopack 기본 활성화 (`next dev` 시 자동 사용)
- Tailwind CSS v4: `@import 'tailwindcss'` + `@tailwindcss/postcss`
- `next/font/google`으로 DM Serif Display + Noto Sans KR 자동 최적화
