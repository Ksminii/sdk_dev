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
