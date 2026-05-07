---
name: viz-rules
version: 1.0.0
domain: insight-forge-default
description: 데이터·지표 형태에 따라 적합한 차트를 자동 선택하는 규칙
depends_on: [data-rules, metric-rules]
author: Insight Forge Team
last_updated: 2026-04-29
---

# 시각화 선택 규칙 (viz-rules)

이 문서는 "어떤 데이터를 어떤 차트로 표현할 것인가"를 결정하는 규칙을 정의한다. 코어 시스템의 `vizRouter.ts` 모듈은 이 규칙을 읽어 각 지표·데이터 형태에 맞는 React 컴포넌트를 자동으로 선택한다.

설계 원칙은 다음 3가지다.

1. **데이터 형태가 차트를 결정한다** — 지표명이 아닌 데이터의 구조로 판단
2. **가독성 우선** — 같은 데이터라도 항목 수에 따라 차트가 바뀐다
3. **일관된 색상 체계** — 모든 차트가 단일 색상 팔레트를 공유

---

## 1. 차트 선택 매핑 테이블

데이터 형태(shape)와 의미(semantic)에 따른 차트 매핑이다.

| 데이터 형태 | 항목 수 | 의미 | 선택 차트 | 우선순위 |
|------------|---------|------|----------|----------|
| 단일 숫자 + 비교값 | 1 | 핵심 지표 강조 | **KPI 카드** | 1 |
| 시계열 (1변수) | 무관 | 시간에 따른 추이 | **라인 차트** | 1 |
| 시계열 (2~5변수) | 무관 | 다중 추세 비교 | **다중 라인 차트** | 1 |
| 범주별 비중 | ≤ 10 | 부분-전체 관계 | **도넛 차트** | 1 |
| 범주별 비중 | > 10 | 부분-전체 관계 | **가로 막대 차트** | 2 (도넛 가독성 저하) |
| 범주별 값 | ≤ 20 | 카테고리 비교 | **세로 막대 차트** | 1 |
| 두 변수 관계 | 무관 | 상관관계 분포 | **산점도** | 1 |
| 다변수 상관 행렬 | N×N | 상관 강도 압축 | **히트맵** | 1 |
| 조건 평가 결과 | 무관 | 자연어 진단 | **인사이트 카드** | 1 |

### 1.1 매핑 결정 규칙 (의사코드)

```
function selectChart(data):
    if data.is_scalar() and has_comparison():
        return "KpiCard"
    
    if data.is_timeseries():
        if data.variable_count == 1:
            return "LineChart"
        elif data.variable_count <= 5:
            return "MultiLineChart"
        else:
            return "MultiLineChart" with sampling
    
    if data.is_proportion():
        if data.category_count <= 10:
            return "DonutChart"
        else:
            return "HorizontalBarChart"
    
    if data.is_categorical():
        return "VerticalBarChart"
    
    if data.is_pairwise_relation():
        return "ScatterPlot"
    
    if data.is_matrix():
        return "Heatmap"
    
    if data.is_evaluation_result():
        return "InsightCard"
    
    return "Fallback: TextDisplay"
```

---

## 2. 지표별 추천 차트

`metric-rules.md`에 정의된 지표들의 권장 시각화 매핑이다.

### 2.1 기본 지표

| 지표 | 차트 타입 | 보조 표시 |
|------|-----------|-----------|
| 일별 수익률 | 라인 차트 | 0% 기준선 |
| 누적 수익률 | 라인 차트 (영역 채움) | 시작점 0% |
| 변동성 | KPI 카드 | 카테고리 색상 (낮음/보통/높음) |
| MDD | KPI 카드 + 미니 라인 차트 | 최대낙폭 구간 음영 |
| 샤프지수 | KPI 카드 | 등급 라벨 (탁월/우수/양호/부족) |

### 2.2 상대 성과 지표

| 지표 | 차트 타입 | 보조 표시 |
|------|-----------|-----------|
| 베타 | KPI 카드 + 게이지 | 1.0 기준선 강조 |
| 알파 | KPI 카드 | 양수=초록, 음수=빨강 |
| 추적오차 | KPI 카드 | - |
| 정보비율 | KPI 카드 | 등급 라벨 |

### 2.3 포트폴리오 지표

| 지표 | 차트 타입 | 보조 표시 |
|------|-----------|-----------|
| 가중 수익률 | 라인 차트 (벤치마크 중첩) | 벤치마크 점선 |
| 자산 비중 | 도넛 차트 (비중 ≤10) / 가로 막대 (>10) | 종목별 색상 고정 |
| 상관계수 행렬 | 히트맵 | 대각선 음영, 값 표기 |
| 종목별 수익률 | 정렬된 가로 막대 | 양수/음수 색상 분리 |

### 2.4 Insight Forge 자체 지표

| 지표 | 차트 타입 | 보조 표시 |
|------|-----------|-----------|
| 분산투자 점수 | KPI 카드 + 원형 진행바 | 색상 등급 (4단계) |
| 집중도 점수 | KPI 카드 + 임계선 표시 | 1500 / 2500 기준선 |
| **포트폴리오 건강도** | 게이지 차트 (Gauge) | 0-40-60-80-100 구간 색상 |
| RAR | KPI 카드 | 등급 라벨 |
| 모멘텀 강도 | KPI 카드 + 화살표 아이콘 | ↑↑↑ / ↑ / ↓ / ↓↓↓ |

---

## 3. 색상 팔레트 (Design Tokens)

모든 차트가 공유하는 색상 시스템이다. CSS 변수와 동일한 토큰을 사용한다.

### 3.1 의미 색상 (Semantic Colors)

```yaml
positive:        "#2E7D32"   # 상승, 이익, 양수
negative:        "#C62828"   # 하락, 손실, 음수
neutral:         "#5B7CFA"   # 중립, 기본 강조
warning:         "#F9A825"   # 주의, 경고
info:            "#0288D1"   # 정보
success:         "#43A047"   # 성공, 우수
danger:          "#D32F2F"   # 위험, 심각
```

### 3.2 등급 색상 (Grade Colors)

포트폴리오 건강도, 분산투자 점수 등 0~100 점수 표시에 사용한다.

```yaml
grade_excellent: "#43A047"   # 80-100 ([O] 매우 우수)
grade_good:      "#7CB342"   # 60-79  ([O] 양호)
grade_moderate:  "#FBC02D"   # 40-59  ([~] 보통)
grade_warning:   "#FB8C00"   # 20-39  ([!] 주의)
grade_critical:  "#E53935"   # 0-19   ([!!] 위험)
```

> **참고**: 위 색상은 표준 권장값이며, 도메인 번들 또는 브랜드 가이드에 맞춰 동일 등급 단계 유지하에서 톤(채도·명도) 조정이 가능하다. 본 시스템의 default 번들은 브랜드 통일성을 위해 moderate를 골드(#BA7517), critical을 다크 레드(#993C1D)로 적용한다.

### 3.3 차트 시리즈 색상 (Categorical Palette)

다종목 표시 시 시리즈별 색상이다. 8색 팔레트를 순환 사용한다.

```yaml
series_palette:
  - "#5B7CFA"   # 1. 메인 블루
  - "#F4A261"   # 2. 따뜻한 오렌지
  - "#43A047"   # 3. 그린
  - "#9C27B0"   # 4. 퍼플
  - "#00ACC1"   # 5. 시안
  - "#FB8C00"   # 6. 오렌지
  - "#E91E63"   # 7. 핑크
  - "#5D4037"   # 8. 브라운
```

### 3.4 히트맵 색상 그라디언트

상관계수 시각화 전용 그라디언트.

```yaml
heatmap_gradient:
  -1.0: "#C62828"   # 강한 음의 상관 (빨강)
  -0.5: "#EF9A9A"
   0.0: "#F5F5F5"   # 무상관 (회색)
   0.5: "#90CAF9"
   1.0: "#1565C0"   # 강한 양의 상관 (파랑)
```

---

## 4. 차트별 세부 스타일

### 4.1 라인 차트

```yaml
LineChart:
  stroke_width: 2
  point_radius: 0          # 일반 상태에서는 점 표시 안함
  point_radius_hover: 4    # 호버 시 강조
  smooth: true             # 곡선 보간
  area_opacity: 0.15       # 영역 채움 (누적수익률용)
  axis:
    x: { format: "YYYY-MM" }
    y: { format: "0.0%", grid: true }
  tooltip:
    format: "{date}: {value:.2%}"
```

### 4.2 도넛 차트

```yaml
DonutChart:
  inner_radius_ratio: 0.6
  padding_angle: 2         # 조각 사이 간격(도)
  show_labels: true
  label_position: outside  # inside | outside
  label_format: "{name}: {value:.1%}"
  legend: right
  small_slice_threshold: 0.03  # 3% 미만은 "기타"로 묶음
```

### 4.3 히트맵

```yaml
Heatmap:
  cell_padding: 1
  show_values: true
  value_format: "0.00"
  diagonal_emphasis: true   # 대각선 굵은 테두리
  tooltip:
    format: "{x} ↔ {y}: {value:.3f}"
```

### 4.4 KPI 카드

```yaml
KpiCard:
  layout: vertical        # 라벨 위, 값 아래
  value_size: 32px
  label_size: 14px
  show_change: true       # 변화량 표시 여부
  change_position: right
  change_format: "{sign}{value:.2%}"
  icon_position: top-right
```

### 4.5 게이지 차트 (건강도 전용)

```yaml
Gauge:
  arc_range: [0, 180]     # 반원형
  segments:
    - { range: [0, 40],   color: "var(--grade-critical)" }
    - { range: [40, 60],  color: "var(--grade-moderate)" }
    - { range: [60, 80],  color: "var(--grade-good)" }
    - { range: [80, 100], color: "var(--grade-excellent)" }
  needle_color: "var(--neutral)"
  show_value: true
  value_size: 28px
```

---

## 5. 레이아웃 규칙

### 5.1 대시보드 그리드

12-column grid 시스템을 사용한다.

```yaml
breakpoints:
  desktop:  ≥ 1280px (12 columns)
  tablet:   ≥ 768px  (8 columns)
  mobile:   < 768px  (4 columns)
```

### 5.2 위젯 크기 분류

| 크기 | desktop | tablet | mobile |
|------|---------|--------|--------|
| `small` (KPI 카드) | 3 col | 4 col | 4 col |
| `medium` (작은 차트) | 6 col | 8 col | 4 col |
| `large` (메인 차트) | 8 col | 8 col | 4 col |
| `full` (히트맵) | 12 col | 8 col | 4 col |

### 5.3 위젯 우선순위

대시보드 상단부터 다음 순서로 배치한다.

1. **KPI 영역** (small × 4): 핵심 지표 한눈에
2. **메인 차트** (large): 시계열 추이
3. **부속 차트** (medium × 2): 자산 비중 + 인사이트
4. **상세 분석** (full): 히트맵 또는 종목 비교

---

## 6. 반응형·접근성 규칙

### 6.1 모바일 대응

- 가로 막대 → 세로 막대로 자동 회전 (모바일에서 가로 공간 부족 시)
- 도넛 차트 범례를 하단으로 이동
- KPI 카드 폰트 크기 축소 (32px → 24px)

### 6.2 색약 대응

- 양수/음수 표시 시 색상에만 의존하지 않고 **아이콘**(↑↓) 또는 **부호**(+/-)를 함께 표시
- 히트맵에 셀 값 텍스트를 항상 표시

### 6.3 다크모드

다크모드 활성화 시 색상 토큰이 자동 전환된다.

```yaml
dark_mode_overrides:
  background: "#1A1F2E"
  foreground: "#E8EAED"
  positive: "#66BB6A"   # 다크모드에서는 약간 밝게
  negative: "#EF5350"
  neutral: "#7C9AFF"
```

---

## 7. 적용 예시

### 7.1 입력: 분산투자 점수 = 58

```yaml
metric: diversification_score
value: 58
type: scalar
range: [0, 100]
```

### 7.2 자동 매핑 결과

```javascript
{
  component: "KpiCard",
  props: {
    label: "분산투자 점수",
    value: 58,
    unit: "점",
    icon: "[차트]",
    color: "var(--grade-moderate)",   // 40-59 구간 색상
    grade_label: "보통",
    auxiliary: {
      type: "ProgressRing",
      max: 100,
      thresholds: [40, 60, 80]
    }
  }
}
```

### 7.3 입력: 종목 간 상관계수 행렬

```yaml
metric: correlation_matrix
value: [[1.0, 0.42, 0.31], [0.42, 1.0, 0.58], [0.31, 0.58, 1.0]]
type: matrix
shape: 3x3
labels: ["삼성전자", "NAVER", "카카오"]
```

### 7.4 자동 매핑 결과

```javascript
{
  component: "Heatmap",
  props: {
    data: [...],
    xLabels: ["삼성전자", "NAVER", "카카오"],
    yLabels: ["삼성전자", "NAVER", "카카오"],
    gradient: "var(--heatmap-gradient)",
    showValues: true,
    cellSize: 80
  }
}
```
