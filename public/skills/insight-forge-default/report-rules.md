---
name: report-rules
version: 1.0.0
domain: insight-forge-default
description: 대시보드/리포트의 전체 구성 흐름과 위젯 배치를 설계하는 규칙
depends_on: [data-rules, metric-rules, viz-rules, insight-rules]
author: Insight Forge Team
last_updated: 2026-04-29
---

# 리포트 구성 흐름 규칙 (report-rules)

이 문서는 개별 위젯이 결정된 이후, **그것들을 어떤 순서로 어디에 배치할 것인가**를 정의한다. 즉, 대시보드 또는 리포트의 **전체 흐름·내러티브·우선순위**를 다룬다.

`viz-rules.md`가 "각 차트 하나의 모양"을 정한다면, 본 문서는 "여러 차트가 모여 만드는 한 화면의 구조"를 정한다. 코어 시스템의 `reportComposer.ts` 모듈은 이 규칙을 읽어 위젯을 자동 배치한다.

설계 원칙은 다음 4가지다.

1. **결론 먼저 (Top-Down Narrative)** — 종합 진단을 가장 위에, 세부 분석은 아래로
2. **시선 흐름 (F-pattern)** — 사용자의 자연스러운 시선 경로를 따라 우선순위 배치
3. **사용자 시나리오 기반** — 누가 보느냐에 따라 강조점이 달라짐
4. **모듈성** — 섹션 단위로 추가·제거 가능

---

## 1. 대시보드 섹션 구조

대시보드는 **5개의 표준 섹션**으로 구성된다. 각 섹션은 활성화/비활성화 가능하며, 순서는 시나리오에 따라 변경 가능하다.

| 순서 | 섹션 ID | 명칭 | 목적 | 기본 활성화 |
|------|---------|------|------|------------|
| 1 | `executive_summary` | 종합 진단 영역 | 한눈에 보는 핵심 결론 | ✅ |
| 2 | `kpi_overview` | KPI 요약 영역 | 4~6개 핵심 지표 카드 | ✅ |
| 3 | `trend_analysis` | 추세 분석 영역 | 시계열·차트 중심 | ✅ |
| 4 | `composition_analysis` | 구성 분석 영역 | 비중·상관관계 중심 | ✅ |
| 5 | `actionable_insights` | 실행 가능 인사이트 영역 | 자연어 진단·권장 행동 | ✅ |

### 1.1 섹션별 상세 구성

#### `executive_summary` (종합 진단)
- **포함 위젯**: 게이지 차트 (포트폴리오 건강도) + 핵심 메시지 1줄
- **차지 영역**: full-width (12 col)
- **표시 우선순위**: critical 등급 인사이트 1개 동반 표시

#### `kpi_overview` (KPI 요약)
- **포함 위젯**: KPI 카드 4~6개
- **차지 영역**: 각 카드 3 col, 가로 4개 정렬
- **포함 지표 (기본)**:
  1. 누적 수익률
  2. 변동성 (연율화)
  3. 샤프지수
  4. 최대낙폭 (MDD)
- **포함 지표 (확장)**: 분산투자 점수, 집중도, RAR, 모멘텀 강도

#### `trend_analysis` (추세 분석)
- **포함 위젯**: 라인 차트 1개 (메인) + 막대/도넛 1개 (보조)
- **차지 영역**: 메인 8 col + 보조 4 col
- **포함 차트**:
  - 메인: 누적 수익률 라인 차트 (벤치마크 중첩)
  - 보조: 자산 비중 도넛

#### `composition_analysis` (구성 분석)
- **포함 위젯**: 히트맵 1개 + 막대 차트 1개
- **차지 영역**: 히트맵 6 col + 막대 6 col
- **포함 차트**:
  - 종목 간 상관계수 히트맵
  - 종목별 수익률 막대 차트

#### `actionable_insights` (실행 가능 인사이트)
- **포함 위젯**: 인사이트 카드 리스트
- **차지 영역**: full-width (12 col)
- **정렬 기준**: severity 우선, priority 보조 (insight-rules.md 9.2 참조)
- **표시 개수**: 최대 6개 (스크롤로 추가 표시)

---

## 2. 시선 흐름 설계 (F-Pattern)

사용자의 시선이 **F자 형태**로 움직인다는 UX 원칙에 따라, 가장 중요한 정보를 좌상단에 배치한다.

```
┌────────────────────────────────────────────────┐
│ ① 종합 진단 ─────────────────────────────────→ │  ← 시선 출발점
│                                                │
│ ② KPI ──→  ─→  ─→  ─→                          │
│                                                │
│ ③ 메인 차트 ────────────→     ④ 자산 비중      │  ← 좌측 우선
│                                                │
│ ⑤ 히트맵 ──────────→         ⑥ 종목별 수익률  │
│                                                │
│ ⑦ 인사이트 카드 ─────────────────────────────→│  ← 결론
└────────────────────────────────────────────────┘
```

### 2.1 우선순위 부여 원칙

- **좌상단 영역**: 가장 중요한 종합 진단 + 핵심 KPI
- **중앙 영역**: 추세·구성 분석 (시간 흐름·관계성)
- **하단 영역**: 실행 가능 인사이트 (스크롤 후 확인)

---

## 3. 사용자 시나리오별 리포트 변형

동일한 데이터라도 **누가 보느냐에 따라** 강조점이 달라진다. 본 시스템은 5가지 시나리오를 지원한다.

### 3.1 시나리오 정의 테이블

| 시나리오 ID | 대상 사용자 | 강조 섹션 | 숨김 섹션 | 추가 메트릭 |
|------------|------------|----------|----------|-----------|
| `personal_default` | 개인 투자자 (기본) | 모든 섹션 | - | - |
| `risk_focused` | 리스크 관리 담당자 | executive_summary, composition_analysis | trend_analysis 축소 | VaR, 베타 |
| `performance_focused` | 운용 성과 평가자 | trend_analysis, kpi_overview | composition_analysis 축소 | 알파, 정보비율 |
| `compliance_review` | 컴플라이언스 검토자 | composition_analysis 강조 (집중도) | trend_analysis 숨김 | 단일종목 비중, 섹터 노출도 |
| `executive_brief` | 임원 1분 브리핑 | executive_summary만 | 나머지 모두 숨김 | 건강도 점수 한 줄 |

### 3.2 시나리오 적용 메커니즘

```yaml
scenario: risk_focused
sections:
  executive_summary: 
    enabled: true
    emphasis: high          # 카드 크기 확대, 색상 강조
  kpi_overview:
    enabled: true
    metrics: [volatility, mdd, beta, var]   # 위험 지표만
  trend_analysis:
    enabled: true
    layout: collapsed        # 축소 표시
  composition_analysis:
    enabled: true
    emphasis: high
    add_widgets: [sector_exposure_heatmap]
  actionable_insights:
    enabled: true
    filter:
      categories: [위험, 분산]    # 위험·분산 카테고리만
```

---

## 4. 위젯 배치 우선순위 알고리즘

여러 지표가 동시에 계산됐을 때 한정된 화면 공간에 무엇을 먼저 보여줄지 결정한다.

### 4.1 위젯 데이터 인터페이스 (Widget Data Interface)

리포트 컴포저(`reportComposer.ts`)가 위젯을 배치할 때 사용하는 표준 데이터 객체의 구조다. 모든 위젯은 다음 필드를 갖는 단일 객체로 시스템 내에서 전달된다. TypeScript/JavaScript 환경에서는 동일 형태의 `interface`로, Python 환경에서는 `dataclass` 또는 `TypedDict`로 구현된다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `id` | string | ✅ | 위젯 고유 식별자 (예: `kpi_volatility`, `chart_returns`) |
| `type` | enum | ✅ | 위젯 종류 (`KpiCard` / `LineChart` / `DonutChart` / `BarChart` / `Heatmap` / `InsightCard` / `Gauge`) |
| `priority_score` | number | ✅ | 우선순위 점수 (0~100, 4.2 공식으로 계산) |
| `props` | object | ✅ | 위젯별 props 객체 (`viz-rules.md`의 차트별 스타일 정의 참조) |
| `data_source` | string | ✅ | 참조하는 데이터셋 또는 지표 ID (예: `metric.volatility`, `dataset.portfolio`) |
| `section_id` | string | ✅ | 소속 섹션 ID (`executive_summary`, `kpi_overview`, ...) |
| `size` | enum | [불가] | 그리드 점유 크기 (`small` / `medium` / `large` / `full`, 기본 `medium`) |
| `metadata` | object | [불가] | 추적용 메타데이터 (생성 시각, 적용된 규칙 ID 등) |

**참고용 인터페이스 정의 (TypeScript)**:

```typescript
interface WidgetData {
  id: string;
  type: 'KpiCard' | 'LineChart' | 'DonutChart' | 'BarChart' 
      | 'Heatmap' | 'InsightCard' | 'Gauge';
  priority_score: number;        // 0~100
  props: Record<string, any>;     // viz-rules에 정의된 차트별 props
  data_source: string;            // "metric.{name}" 또는 "dataset.{name}"
  section_id: SectionId;
  size?: 'small' | 'medium' | 'large' | 'full';
  metadata?: {
    created_at?: string;
    applied_rules?: string[];
  };
}
```

이 인터페이스는 `viz-rules.md`의 위젯 정의와 직접 연결된다. AI 또는 개발자가 본 시스템을 구현할 때 이 구조를 따르면 컴포넌트 간 props 전달이 일관되게 유지된다.

### 4.2 우선순위 점수 공식

각 위젯에 0~100점의 우선순위 점수를 부여한다.

```
priority_score = 
    base_score                    # 위젯 기본 중요도
  + severity_bonus                # 트리거된 critical 인사이트가 있는 경우 +
  - data_quality_penalty          # 해당 지표의 데이터 품질이 낮으면 -
  + scenario_weight               # 현재 시나리오에서 강조되는 카테고리면 +
```

### 4.3 위젯별 base_score (기본값)

| 위젯 | base_score |
|------|-----------|
| 포트폴리오 건강도 게이지 | 95 |
| 핵심 KPI 4개 | 85 |
| 누적 수익률 라인 차트 | 75 |
| 자산 비중 도넛 | 70 |
| 자체 지표 (분산점수, 집중도, RAR, 모멘텀) | 65 |
| 상관계수 히트맵 | 60 |
| 종목별 수익률 막대 | 55 |
| 인사이트 카드 (severity별 차등) | 30~95 |

### 4.4 표시 개수 제한

| 화면 크기 | 최대 위젯 수 | 인사이트 카드 수 |
|----------|------------|-----------------|
| Desktop (≥1280px) | 8 | 6 |
| Tablet (768~1279px) | 6 | 4 |
| Mobile (<768px) | 4 | 3 |

기준 초과 시 우선순위 점수가 낮은 위젯이 자동 제외된다.

---

## 5. 리포트 내러티브 흐름 규칙

대시보드 전체가 **하나의 이야기**로 읽히도록 다음 흐름을 따른다.

### 5.1 표준 내러티브 (5단계)

```
1. "당신의 포트폴리오는 ___점입니다."     ← executive_summary
        ↓
2. "주요 지표는 다음과 같습니다."          ← kpi_overview
        ↓
3. "최근 ___기간 동안 이런 추세였습니다."  ← trend_analysis
        ↓
4. "구성을 보면 ___한 특징이 있습니다."    ← composition_analysis
        ↓
5. "그래서 ___을(를) 권장합니다."          ← actionable_insights
```

### 5.2 섹션 간 전환 텍스트

각 섹션 사이에 자동 생성되는 brief가 있다. `transition_rules`에 정의:

```yaml
transitions:
  executive_to_kpi:
    template: "위 종합 진단의 근거가 되는 핵심 지표 {n}개를 살펴봅니다."
  
  kpi_to_trend:
    template: "이 수치들이 시간에 따라 어떻게 변화했는지 확인해보세요."
  
  trend_to_composition:
    template: "이번엔 포트폴리오의 구성 측면을 분석합니다."
  
  composition_to_insight:
    template: "위 분석을 종합한 실행 가능한 권장 사항입니다."
```

---

## 6. 실시간 업데이트 규칙

사용자가 필터·기간을 조정하면 어떤 섹션이 갱신되는지 정의한다.

| 사용자 액션 | 갱신 섹션 | 갱신되지 않는 것 |
|------------|----------|----------------|
| 기간 필터 변경 | 모든 섹션 | 시나리오 설정 |
| 종목 필터 변경 | kpi, trend, composition | executive_summary 시나리오 |
| 시나리오 전환 | 섹션 표시/숨김 + 강조 | 데이터 자체는 유지 |
| 비교 모드 활성 | 모든 섹션 (분할 표시) | - |

### 6.1 갱신 우선순위

여러 섹션을 동시 갱신할 때:

1. `executive_summary` 먼저 (사용자가 바로 보는 영역)
2. `kpi_overview` 다음
3. `actionable_insights` (인사이트 재평가)
4. `trend_analysis`, `composition_analysis` 마지막

이 순서로 점진적 렌더링하여 체감 속도를 향상시킨다.

---

## 7. 리포트 출력 형식

대시보드 외에 **PDF 리포트** 출력도 지원한다. PDF 출력 시 추가 규칙:

### 7.1 페이지 구성

```yaml
pdf_layout:
  page_1:
    - section: executive_summary
    - section: kpi_overview
  page_2:
    - section: trend_analysis
  page_3:
    - section: composition_analysis
  page_4:
    - section: actionable_insights (전체)
  page_5+:
    - appendix: raw_metric_table
    - appendix: applied_skills_md
```

### 7.2 출력 시 추가 요소

- **표지**: 분석 일자, 대상 데이터, 적용 Skills 번들명
- **부록**: 적용된 Skills.md의 핵심 규칙 발췌 (투명성 가치 구현)

---

## 8. 적용 예시

### 8.1 입력: 시나리오 = `risk_focused`

```yaml
scenario: risk_focused
data: portfolio_aggressive.json
applied_skills: insight-forge-default
```

### 8.2 자동 구성된 대시보드

```
┌──────────────────────────────────────────────────────┐
│ [강조] 포트폴리오 건강도 52점 [!] 주의                  │
│        [주의] 변동성과 집중도 모두 임계치 초과              │
└──────────────────────────────────────────────────────┘

[변동성 32%] [MDD -18%] [베타 1.4] [VaR -8.2%]
   [!]           [!]         [!]         [!]

[추세 차트 - 축소 표시]

┌─────────────────┐  ┌─────────────────┐
│ 상관계수 히트맵   │  │ 섹터 노출도      │
│ (강조 표시)      │  │ (자동 추가)      │
└─────────────────┘  └─────────────────┘

Tip: 실행 가능 인사이트 (위험·분산 카테고리만)
   [!!] 단일 종목 42% 비중 - 즉시 조치 필요
   [!] 변동성 32% - 벤치마크 1.6배
   [!] 집중도 3400 - 고도 집중 구간
```

같은 데이터라도 시나리오에 따라 **강조점·표시 항목·메시지**가 자동으로 달라진다.

---

## 9. 시나리오 추가 가이드

새 시나리오를 추가하려면 다음 정보만 정의하면 된다.

```yaml
new_scenario:
  id: my_custom_scenario
  target_user: "ESG 분석 담당자"
  emphasized_sections: [composition_analysis]
  hidden_sections: [trend_analysis]
  required_metrics: [esg_score, carbon_intensity]
  insight_filter:
    categories: [지속가능성, 거버넌스]
  narrative_style: "비교 중심"
```

이 한 블록만 추가하면 코어 시스템이 자동으로 새 시나리오를 인식하고 활성화한다. **Skills.md만으로 새로운 사용 케이스가 즉시 가능**한 것이 본 시스템의 핵심 가치다.
