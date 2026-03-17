# @landing-analytics/sdk

랜딩페이지 사용자 행동 데이터를 자동 수집하여 백엔드로 전송하는 경량 JavaScript SDK.

LLM 기반 랜딩페이지 분석 시스템의 데이터 수집 파트를 담당한다.

## 주요 기능

- **이벤트 자동 캡처** — 클릭, 페이지뷰, 스크롤(10% 단위), 입력
- **세션 관리** — UUIDv7 기반, 30분 idle / 24시간 max 타임아웃
- **배치 전송** — 큐 기반 배치 + sendBeacon 페이지 이탈 처리
- **프라이버시** — 민감 입력(email, password, tel) 자동 마스킹
- **세션 리플레이** — rrweb 연동 (optional)
- **런타임 의존성 0개** — rrweb는 optional peerDependency

## 빌드

```bash
npm install
npm run build    # dist/에 ESM, CJS, UMD 생성
npm test         # Jest 테스트 실행
```

## 사용법

### Script 태그

```html
<script src="dist/umd/landing-analytics.js"></script>
<script>
  LandingAnalytics.LandingAnalytics.init({
    apiEndpoint: 'https://your-api.com/events',
    apiKey: 'your-api-key',
  });
</script>
```

### ESM

```typescript
import { LandingAnalytics } from '@landing-analytics/sdk';

LandingAnalytics.init({
  apiEndpoint: 'https://your-api.com/events',
  apiKey: 'your-api-key',
  debug: true,
  sessionRecording: true,
});

// 커스텀 이벤트
const sdk = LandingAnalytics.getInstance();
sdk.capture('signup_click', { variant: 'A' });
```

## 설정 옵션

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `apiEndpoint` | (필수) | 이벤트 전송 엔드포인트 |
| `apiKey` | (필수) | API 인증 키 |
| `flushInterval` | 3000ms | 배치 전송 주기 |
| `flushQueueSize` | 20 | 자동 flush 큐 크기 |
| `sessionIdleTimeout` | 30분 | 세션 idle 타임아웃 |
| `sessionMaxDuration` | 24시간 | 세션 최대 지속 시간 |
| `debug` | false | 콘솔 디버그 로그 |
| `sessionRecording` | false | rrweb 세션 리플레이 |
| `beforeSend` | - | 전송 전 이벤트 필터/수정 훅 |

## 테스트 서버

SDK 검증용 Express 서버가 `server/`에 포함되어 있다. 이벤트 수신, 대시보드, 세션 리플레이 재생을 제공한다.

```bash
cd server
npm install
npm start
# http://localhost:3000 에서 대시보드 확인
```

### API 엔드포인트

| Method | Path | 설명 |
|---|---|---|
| POST | `/events` | SDK 분석 이벤트 수신 |
| POST | `/events/recordings` | 세션 리플레이 데이터 수신 |
| GET | `/events` | 이벤트 조회 (?sessionId, ?type) |
| GET | `/sessions` | 세션 목록 + 통계 |
| GET | `/sessions/:id/replay` | 리플레이 데이터 조회 |
| DELETE | `/reset` | 전체 데이터 초기화 |

## 로컬 테스트 방법

### 최초 1회 (의존성 설치)

```bash
npm install
cd server && npm install
```

### 테스트 실행 순서

```bash
# 1. SDK 빌드
npm run build

# 2. 서버 시작 (별도 터미널에서)
cd server && node index.js

# 3. test.html을 브라우저에서 열기
open test.html

# 4. 대시보드에서 이벤트 확인
#    http://localhost:3000
```

### 코드 수정 후 재테스트

- SDK 코드(`src/`) 수정 → `npm run build` 후 test.html 새로고침
- 대시보드(`server/public/index.html`) 수정 → 대시보드 새로고침만 하면 됨
- 서버(`server/index.js`) 수정 → 서버 재시작 (`Ctrl+C` 후 `node index.js`)

## 데모

`test.html`을 브라우저에서 열면 SDK 동작을 확인할 수 있다.

- **서버 실행 시** — 대시보드에서 실시간 모니터링 + 세션 리플레이 재생
- **서버 없이** — 콘솔(F12)에서 캡처된 이벤트 확인 (GitHub Pages 배포 가능)

## 프로젝트 구조

```
src/
├── core.ts              # LandingAnalytics 싱글턴
├── types.ts             # 타입 정의
├── config.ts            # 설정 병합
├── constants.ts         # 상수
├── events/              # 이벤트 캡처 (click, pageview, scroll, input)
├── session/             # 세션 관리 (UUIDv7, sessionStorage)
├── transport/           # 전송 (배치 큐, fetch/sendBeacon)
├── privacy/             # 입력값 마스킹
├── recorder/            # 세션 리플레이 (rrweb)
└── utils/               # UUID, 로거, DOM 유틸

server/                  # 테스트 서버 (Express, 인메모리 저장)
__tests__/               # Jest 유닛 테스트
dist/                    # 빌드 결과 (ESM, CJS, UMD)
```

## 수집 이벤트 형식

### 이벤트 타입별 properties

| 타입 | 설명 | properties |
|------|------|------------|
| `pageview` | 페이지 진입 | `title`, `referrer`, `path` |
| `click` | 클릭 | `selector`, `tagName`, `text`, `href`, `x`, `y` |
| `scroll` | 스크롤 (10% 단위) | `maxDepth`, `direction` |
| `input` | 입력 (자동 마스킹) | `selector`, `fieldType`, `value` |
| `custom` | 커스텀 이벤트 | 자유 형식 |

### 이벤트 전송 — `POST /events`

```json
{
  "apiKey": "test-key-123",
  "sentAt": 1742200000000,
  "events": [
    {
      "type": "click",
      "timestamp": 1742200000000,
      "sessionId": "019cfb3e-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
      "url": "https://example.com/landing",
      "properties": {
        "selector": ".btn-cta",
        "tagName": "BUTTON",
        "text": "Get Started",
        "x": 400,
        "y": 520
      }
    }
  ]
}
```

### 세션 리플레이 전송 — `POST /events/recordings`

```json
{
  "apiKey": "test-key-123",
  "sessionId": "019cfb3e-xxxx-7xxx-xxxx-xxxxxxxxxxxx",
  "sentAt": 1742200000000,
  "events": [ ]
}
```

> `events`에는 rrweb가 생성한 DOM 스냅샷/변경 이벤트가 들어간다.

### 전송 방식

- 기본: `fetch` POST (JSON, `keepalive: true`)
- 페이지 이탈 시: `sendBeacon` fallback
- 배치 전송: 기본 3초 간격 또는 큐 20개 차면 즉시

### 협의 필요 사항

- 인증 방식 — 현재 body의 `apiKey`로 전달. 헤더 또는 토큰 기반으로 변경 가능
- 응답 형식 — 현재 `{ "status": "ok" }`만 기대
- 리플레이 저장소 — rrweb 이벤트는 세션당 수 MB 이상 될 수 있음
