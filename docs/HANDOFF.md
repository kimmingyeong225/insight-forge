# 🎯 Claude Code 핸드오프 문서

이 문서는 Claude Code가 이 프로젝트를 빠르게 이해하고 다음 작업을 시작할 수 있도록 작성됐다.
**Claude Code는 이 문서를 먼저 읽어야 한다.**

---

## 📌 프로젝트 개요

**프로젝트명**: Insight Forge — 규칙으로 인사이트를 주조하다  
**대회**: DACON 월간 해커톤 — "투자 데이터를 시각화하라: Skills 기반 대시보드 설계"  
**팀**: 2인팀 (부산)  
**상금**: 100만원  
**제출 마감**: 2026-05-14 09:59 (배포 URL 제출)  
**평가**: 대중투표 60% / 참가팀 20% / 대중 20% → 상위 10팀 → 내부 심사

### 평가 항목 (100점)
| 항목 | 배점 | 현재 자체 평가 |
|------|------|--------------|
| 범용성 (구조 대응 + 재사용성) | 25 | 23 |
| Skills.md 설계 (5개 역할 + frontmatter) | 25 | 24 |
| 대시보드 자동 생성 | 25 | 22 |
| 바이브 코딩 활용 | 15 | 13 |
| 실용성·창의성 | 10 | 9 |
| **합계** | 100 | **약 91점** |

**B-2 작업으로 범용성 23 → 25, 실용성 9 → 10 달성 목표 = 약 94점**

---

## 🏗️ 시스템 핵심 컨셉

**"동일한 코어 시스템, 다른 .md 규칙."**

- Skills.md 5개 파일을 fetch + 파싱하여 시스템이 동작
- 번들 교체(default ↔ crypto)만으로 도메인 전환
- 코어 코드는 한 줄도 바뀌지 않음

### 차별화 위젯 ⭐
- **Skills.md Inspector** (우측 패널): 적용된 .md 원문을 그대로 표시 → 투명성
- **자체 정의 지표 5종** (★ 마크): 다른 시스템에 없는 자체 산식

---

## 📂 폴더 구조

```
insight-forge-app/
├── public/
│   ├── data/                            # (예정) 실시간 시세 캐시
│   └── skills/
│       ├── insight-forge-default/       # 주식·금융기업 번들 (5개 .md + README)
│       └── insight-forge-crypto/        # 암호화폐 번들 (5개 .md + README)
├── src/
│   ├── components/                      # React 위젯 (9개)
│   │   ├── KpiCard.jsx                 # 단일 지표 카드
│   │   ├── Gauge.jsx                   # 건강도 게이지 (반원)
│   │   ├── LineChart.jsx               # 시계열 (Recharts AreaChart)
│   │   ├── DonutChart.jsx              # 자산 비중
│   │   ├── BarChart.jsx                # 종목별 수익률
│   │   ├── Heatmap.jsx                 # 상관계수 행렬
│   │   ├── InsightCard.jsx             # 인사이트 카드
│   │   ├── SkillsInspector.jsx         # ⭐ 우측 패널 (.md 원문 표시)
│   │   └── DataUploader.jsx            # CSV/JSON 업로드 모달
│   ├── core/                            # Skills.md 처리 엔진
│   │   ├── parser.js                   # frontmatter + 마크다운 파싱
│   │   ├── normalizer.js               # data-rules 적용 (정규화)
│   │   ├── metrics.js                  # ⭐ 자체 지표 5종 + 베타·알파
│   │   ├── vizRouter.js                # viz-rules 적용 (차트 매핑)
│   │   ├── insights.js                 # ⭐ 22개 인사이트 트리거
│   │   ├── datasets.js                 # 14개 더미 데이터셋 + buildUserDataset
│   │   ├── kpiDefinitions.js           # KPI 메타정보
│   │   └── scenarios.js                # 시나리오 9종
│   ├── pages/
│   │   ├── Dashboard.jsx               # 메인 페이지
│   │   └── Dashboard.css               # 페이지 스타일
│   ├── store/
│   │   └── useStore.js                 # Zustand 전역 상태
│   ├── styles/
│   │   └── global.css                  # 디자인 토큰 (색상·폰트)
│   ├── App.jsx
│   └── main.jsx
├── docs/                                # 핸드오프 문서 (이 폴더)
│   ├── HANDOFF.md                      # 이 파일
│   └── NEXT-WORK.md                    # 다음 작업 상세
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                          # SPA rewrite 설정
└── README.md
```

---

## ✅ 현재까지 구현 완료 (5/8 기준)

### 1. Skills.md 5개 파일 × 2 번들 = 10개 .md
- data-rules: 컬럼 매핑, 결측치 처리, 비중 정규화
- metric-rules: 기본 지표 + 자체 지표 5종 (수식 포함)
- viz-rules: 차트 자동 매핑, 등급 색상
- insight-rules: 22개 트리거 조건
- report-rules: 시나리오 5종 + 위젯 우선순위 + WidgetData 인터페이스

### 2. 자체 정의 지표 5종 (★)
metric-rules.md에 정의된 수식을 `src/core/metrics.js`에서 1:1 구현:
1. **분산투자 점수** = `100 × (1 - mean_correlation)`
2. **집중도 점수 (HHI)** = `Σ(weight²) × 10000`
3. **포트폴리오 건강도** = `0.30×샤프 + 0.30×MDD + 0.20×분산 + 0.20×변동성`
4. **위험조정수익률 (RAR)** = `cum_return / (vol × √(days/252))`
5. **모멘텀 강도** = `(1m_return - prior_3m_avg) × 100`

추가: **베타·알파** (벤치마크 대비)

### 3. 인사이트 22개 자동 트리거
`src/core/insights.js`에서 severity (critical/warning/info/success) + priority + category로 평가.
시나리오의 `insightFilter`와 연동되어 카테고리별 필터링 가능.

### 4. 시나리오 9종
- **default 5종**: personal_default / risk_focused / performance_focused / compliance_review / executive_brief
- **crypto 4종**: crypto_default / defi_focused / stablecoin_strategy / trader_realtime

각 시나리오는:
- 표시할 KPI 선택
- 섹션 강조/축소/숨김 (hideSections)
- 인사이트 카테고리 필터 (insightFilter)
- 임원 브리핑은 차트·히트맵 모두 숨김

### 5. 14개 데이터셋 (시드 기반 GBM 시뮬레이션)
- **default 8개**: balanced, conservative, aggressive, dividend, semiconductor, battery, global, concentrated
- **crypto 6개**: balanced, conservative, aggressive, btc_only, defi, meme

### 6. CSV/JSON 업로드 (DataUploader)
- 한글/영문 컬럼명 자동 매핑 (data-rules.md 적용)
- 비중 합계 1.0 ± 0.01 검증 + 자동 정규화
- 파일 업로드 / 텍스트 붙여넣기 / 샘플 로드 지원

### 7. 9개 위젯 + Skills.md Inspector
- 우측 320px 패널에 5개 .md 탭 → 클릭 시 원문 표시
- 시각적 차별화 핵심 위젯

### 8. 디자인 시스템
- **Editorial Fintech**: 네이비(#0F1B3D) + 크림(#F5F1E8) + 골드(#BA7517)
- **타이포**: Pretendard (sans) + Times New Roman italic (숫자 디스플레이)
- 디자인 토큰은 `src/styles/global.css` 상단 `:root`

---

## 🚧 다음 작업: B-2 (Yahoo Finance 실시간 연동)

자세한 내용은 `docs/NEXT-WORK.md` 참조.

### 핵심 목표
지금 GBM 시뮬레이션으로 만든 가짜 시계열을 → **진짜 Yahoo Finance 데이터로** 교체.

### 단계
1. `api/stock.js` — Vercel Serverless Function (Yahoo Finance 프록시)
2. 종목 검색 UI — 헤더에 검색창
3. `datasets.js` — fetch 모드 추가
4. 폴백 — Yahoo 죽으면 캐시 사용
5. 사전 캐시 30개 — 한국 대형주 20 + 미국 대형주 10
6. 로딩/에러 UI

### 작업 시간: 약 3시간

---

## ⚙️ 개발 환경

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev          # http://localhost:5173

# 프로덕션 빌드
npm run build        # → dist/

# 빌드 미리보기
npm run preview
```

### 의존성
- `react@^18.3.1`
- `react-dom@^18.3.1`
- `recharts@^2.12.7`
- `zustand@^4.5.4`
- `vite@^5.4.1`

---

## 🎯 코딩 스타일 + 사용자 선호

이전 작업에서 사용자가 명시한 선호:
- **한국어 캐주얼 톤**으로 답변
- **시각적 모킹** 좋아함
- **결정 주도하는 거** 좋아함 (옵션 제시 후 추천)
- **짧고 직접적인** 답변 선호
- **표·체크리스트** 형식 좋아함
- **작업 분할보다 한 번에 끝내는 거** 선호 (단 외부 API 의존 작업은 단계별로)

### 코드 컨벤션
- 함수형 React 컴포넌트 + Hooks
- 외부 라이브러리 최소화 (이미 정의된 의존성만 사용)
- expr-eval은 사용 안 함 (수식은 직접 JS로 구현 — metric-rules.md에 명시)
- CSS는 BEM 비슷한 if-{component}__{element} 네이밍

---

## ⚠️ 주의사항 / 함정

### 1. 한글 텍스트 인코딩
- 모든 .md, .jsx 파일은 UTF-8
- LibreOffice로 PDF 변환 시 일부 한글 → ▢ 깨짐 발생 (이전에 처리 완료)

### 2. Skills.md fetch 경로
- public/skills/{bundleId}/{file}.md 패턴
- Vite는 public/ 자동으로 dist/ 복사
- 배포 후에도 fetch 정상 동작

### 3. 빌드 경고
- "Some chunks are larger than 500 kB" 경고 나오는데 무시해도 됨 (Recharts가 큼)

### 4. 개발 서버 vs 정적 서버
- `npm run dev`: HMR 핫 리로드 (개발용)
- `npm run preview`: dist 결과물 정적 서버 (배포 전 검증용)

---

## 🔗 외부 자료

### 우리가 만든 산출물 (별도 zip)
- `Insight_Forge_기획서.pdf` (647KB) — 4/30 제출 완료
- `skills-bundles-PDF.zip` (1.4MB) — 5/7 제출 완료
- 둘 다 docs/ 폴더에 백업 권장

### 대회 홈페이지
- DACON 월간 해커톤

### 디자인 레퍼런스
- "Editorial Fintech" 무드 (Bloomberg + 모던 핀테크)

---

## 💬 막히면 어디 가지?

- **이 프로젝트의 방향성·의도** 관련 질문 → 사용자가 작업한 Claude.ai 대화 (왼쪽 사이드바에 보존됨)
- **Vercel 배포 / Yahoo API 에러** → Claude Code에서 즉시 디버깅
- **디자인 변경 / .md 수정** → Claude.ai 대화 또는 Claude Code 둘 다 OK

---

작성일: 2026-05-08  
다음 업데이트: B-2 작업 완료 후
