# Someday — AI 여행 코스 생성 앱

> "언젠가 가야지 했던 곳들, 이제 가봐요"

사진 한 장으로 장소를 인식하고, Claude AI가 최적 여행 코스를 만들어주는 모바일 웹앱입니다.

## 주요 기능

- **사진 → 장소 인식** : EXIF GPS 좌표 또는 Claude Vision으로 사진 속 장소를 자동 분석
- **AI 코스 생성** : 인식된 지역 기반으로 Kakao Maps 주변 장소를 검색하고 Claude가 최적 동선의 여행 코스를 생성
- **타임라인 + 지도** : 생성된 코스를 시간대별 타임라인과 Kakao 지도로 동시에 확인
- **코스 공유** : 완성된 여행 코스를 URL로 공유
- **데모 모드** : API 키 없이도 샘플 코스로 앱 전체 흐름 체험 가능

## 기술 스택

| 영역 | 기술 |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 |
| AI | Claude API (Anthropic) — Vision + 텍스트 생성 |
| 지도 | Kakao Maps REST API |
| 사진 분석 | exifr (EXIF GPS 추출) |
| 캐시 | LRU Cache (서버 인메모리) |

## 폴더 구조

```
app/
  page.tsx          # 스플래시 · 온보딩 · 홈 (React 상태 머신)
  upload/           # 사진 업로드 · EXIF 분석 · 지역 선택
  plan/             # 여행 코스 타임라인 · 지도 · 공유
  api/              # Route Handlers (Claude, Kakao 프록시)

components/
  SceneCanvas.tsx   # seed + themeIndex로 산/달/별 배경을 Canvas에 결정론적으로 렌더링
  BottomNav.tsx     # 하단 네비게이션
  PlaceImage.tsx    # 장소 이미지 컴포넌트
  Toast.tsx         # 토스트 알림

lib/
  claude.ts         # Anthropic SDK 래퍼 (Vision + 코스 생성 프롬프트)
  kakao.ts          # Kakao Maps REST API 클라이언트
  exif.ts           # EXIF GPS 파싱 유틸
  demo.ts           # 데모용 샘플 코스 데이터
  cache.ts          # LRU Cache 설정
  api.ts            # 클라이언트 → API Route fetch 헬퍼
```

## 데이터 흐름

```
[사진 업로드] → EXIF GPS 추출 or Claude Vision 분석
      ↓
[지역 확인] → Kakao 장소 검색 (주변 명소 · 음식점 · 카페)
      ↓
[Claude 코스 생성] → 최적 동선 타임라인 JSON 반환
      ↓
sessionStorage 저장 (someday-course, someday-region)
      ↓
[plan 페이지] → 타임라인 + 지도 렌더링 + 공유
```

## 시작하기

### 환경변수 설정

`.env.local` 파일을 생성하고 아래 값을 입력하세요.

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

> 두 키 모두 없어도 `DEMO_COURSE` 데이터로 앱이 동작합니다.

### 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인하세요.

### 빌드 & 배포

```bash
npm run build
npm run start
```

## 라이선스

MIT
