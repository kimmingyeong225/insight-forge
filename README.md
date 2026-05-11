# Insight Forge

> 규칙으로 인사이트를 주조하다.
> Skills.md 기반 범용 투자 분석 대시보드 시스템.

## 🎯 개요

**Insight Forge**는 투자 분석 규칙을 정의한 Skills.md 문서를 입력받아, 어떤 형태의 투자 데이터든 일관된 기준으로 분석·시각화·해석하는 **규칙 기반 범용 투자 대시보드 시스템**입니다.

핵심 컨셉: **"동일한 코어, 다른 규칙."** Skills.md 번들을 갈아끼우면 동일한 시스템이 주식·암호화폐·ESG 등 다른 도메인 분석으로 즉시 전환됩니다.

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18+ 
- npm 또는 yarn

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev
# → http://localhost:5173 으로 접속

# 3. 프로덕션 빌드
npm run build
npm run preview
```

### 환경변수 설정 (실시간 데이터 사용 시)

`.env.local` 파일을 프로젝트 루트에 생성하세요.
두 키 모두 없어도 GBM 시뮬레이션 데이터로 동작합니다.

```env
# 한국 주식 (공공데이터포털 KRX API 발급)
DATA_GO_KR_API_KEY=your_key

# 미국 주식 · 암호화폐 (Twelve Data 발급)
TWELVEDATA_API_KEY=your_key
```

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포 (첫 실행 시 프로젝트 연결)
vercel --prod
```

또는 GitHub 저장소를 Vercel에 연결하면 push만으로 자동 배포됩니다.

## 📂 프로젝트 구조

```
insight-forge/
├── api/
│   └── stock.js                         # Vercel Serverless 프록시 (CORS 우회)
├── public/
│   └── skills/                          # 사용자가 갈아끼울 수 있는 Skills 번들
│       ├── insight-forge-default/        # 주력 번들 (주식·금융기업)
│       │   ├── README.md
│       │   ├── data-rules.md
│       │   ├── metric-rules.md
│       │   ├── viz-rules.md
│       │   ├── insight-rules.md
│       │   └── report-rules.md
│       └── insight-forge-crypto/         # 확장 번들 (암호화폐)
│           └── ... (동일 구조)
├── scripts/
│   └── build-cache.mjs                  # 정적 캐시 사전 빌드 스크립트
├── src/
│   ├── components/                       # React 위젯 6종
│   │   ├── StockSearch.jsx              # 종목 검색 자동완성 (실시간 모드)
│   │   ├── KpiCard.jsx                  # 단일 지표 카드
│   │   ├── LineChart.jsx                # 시계열 라인
│   │   ├── DonutChart.jsx               # 자산 비중 도넛
│   │   ├── BarChart.jsx                 # 종목별 수익률 막대
│   │   ├── Heatmap.jsx                  # 상관계수 히트맵
│   │   ├── InsightCard.jsx              # 자연어 진단 카드
│   │   ├── Gauge.jsx                    # 건강도 게이지
│   │   └── SkillsInspector.jsx          # 우측 .md 원문 패널 ⭐
│   ├── core/                             # Skills.md 처리 엔진
│   │   ├── parser.js                    # frontmatter + 마크다운 → 객체
│   │   ├── normalizer.js                # data-rules 적용 (정규화)
│   │   ├── metrics.js                   # metric-rules 적용 (지표 계산)
│   │   ├── vizRouter.js                 # viz-rules 적용 (차트 선택)
│   │   ├── insights.js                  # insight-rules 적용 (조건 평가)
│   │   ├── datasets.js                  # 더미 데이터 생성기
│   │   ├── kpiDefinitions.js            # KPI 메타정보
│   │   └── scenarios.js                 # report-rules 시나리오
│   ├── pages/
│   │   ├── Dashboard.jsx                # 메인 대시보드
│   │   └── Dashboard.css                # 페이지 스타일
│   ├── store/
│   │   └── useStore.js                  # Zustand 전역 상태
│   ├── styles/
│   │   └── global.css                   # 디자인 토큰 + 전역 스타일
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## 🎨 핵심 차별화 기능

### 1. Skills.md 인스펙터 패널 (우측)
대시보드 우측에 현재 적용 중인 Skills.md 원문이 그대로 표시됩니다. 사용자가 어느 규칙으로 분석되는지 **투명하게 확인 가능**합니다.

### 2. 번들 토글 (헤더)
헤더의 셀렉터에서 `insight-forge-default`(주식)와 `insight-forge-crypto`(암호화폐)를 즉시 전환할 수 있습니다. **시스템 코어 코드는 변경되지 않으며**, 오직 .md 파일만 바뀝니다.

### 3. 자체 정의 지표 ⭐
`metric-rules.md`에 정의된 5종의 차별화 지표가 KPI 카드에 별표(★)로 강조됩니다.

- 분산투자 점수 (Diversification Score)
- 집중도 점수 (HHI 기반)
- 포트폴리오 건강도 (4지표 가중평균)
- 위험조정수익률 (RAR)
- 모멘텀 강도 (Momentum Strength)

### 4. 자연어 인사이트 자동 생성
`insight-rules.md`에 정의된 22개 트리거 조건을 평가하여, 조건 충족 시 자연어 메시지 + 권장 행동을 자동 생성합니다.

### 5. 시나리오 기반 리포트
`report-rules.md`의 5개 시나리오(개인·리스크·성과·컴플라이언스·임원)를 토글하면 동일 데이터에 대해 다른 강조점의 대시보드가 즉시 구성됩니다.

### 6. 실시간 데이터 연동 ⭐ (B-2)
헤더의 **실시간 모드** 토글을 켜면 GBM 시뮬레이션 대신 실제 시장 데이터로 대시보드를 구성합니다.

| 자산 유형 | 데이터 소스 | 폴백 |
|----------|------------|------|
| 한국 주식 (6자리 코드) | 공공데이터포털 KRX API | Twelve Data → JSON 캐시 → 시뮬레이션 |
| 미국 주식 · 암호화폐 | Twelve Data API | JSON 캐시 → 시뮬레이션 |

- 종목 검색창에서 한글 이름 또는 코드로 검색 가능 (삼성전자, AAPL, BTC/USD 등)
- 각 KPI 카드 아래 `live` / `cache` / `simulation` 뱃지로 데이터 출처 표시
- `npm run build-cache` 로 정적 JSON 캐시를 사전 빌드 가능

## 🛠 기술 스택

| 계층 | 선택 |
|------|------|
| 프레임워크 | React 18 + Vite |
| 스타일 | CSS Variables (Pretendard 폰트) |
| 차트 | Recharts |
| 상태 관리 | Zustand |
| 데이터 소스 | 공공데이터포털 KRX API · Twelve Data API |
| API 프록시 | Vercel Serverless Functions (`api/stock.js`) |
| 배포 | Vercel |

## 🧪 Skills.md 작성 가이드

자체 Skills 번들을 만들려면 `public/skills/` 폴더 아래에 새 폴더를 만들고 5개의 .md 파일을 작성하세요. 본 시스템의 `loadBundle()` 함수가 자동으로 fetch하여 적용합니다.

상세 작성 가이드는 [insight-forge-default/README.md](public/skills/insight-forge-default/README.md)를 참고하세요.

## 📋 라이선스 

해커톤 출품작 — DACON 월간 해커톤 "투자 데이터를 시각화하라"
