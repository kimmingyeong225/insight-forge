---
name: viz-rules
version: 1.0.0
domain: insight-forge-crypto
description: 암호화폐 데이터·지표 형태에 따라 적합한 차트를 자동 선택하는 규칙
depends_on: [data-rules, metric-rules]
author: Insight Forge Team
last_updated: 2026-04-29
---

# 시각화 선택 규칙 (viz-rules) — 암호화폐 도메인

본 문서는 암호화폐 특성을 반영한 시각화 규칙을 정의한다. 주식 도메인과 동일한 위젯 카탈로그를 사용하되, 색상·시간 단위·임계값을 암호화폐에 맞게 조정한다.

---

## 1. 차트 선택 매핑

암호화폐 특화 매핑이 추가됐다.

| 데이터 형태 | 선택 차트 | 비고 |
|------------|----------|------|
| 시간별 시계열 (1변수) | 라인 차트 | 단위: hour 기준 |
| 분단위 시계열 (실시간) | 캔들스틱 차트 | 1m/5m/1h 토글 |
| 코인별 비중 | 도넛 차트 | BTC/ETH/스테이블/알트 색상 고정 |
| 코인 간 상관계수 | 히트맵 | 일반적으로 높은 값 다수 |
| NVT, 활성 주소 등 펀더멘털 | KPI 카드 + 추세 화살표 | 신규 |
| 온체인 vs 가격 비교 | 듀얼 축 라인 차트 | 신규 |

---

## 2. 색상 팔레트 — 코인별 고정 색상

암호화폐는 브랜드 색상이 강해서 코인별 색상을 고정한다.

```yaml
coin_colors:
  BTC:  "#F7931A"   # 비트코인 오렌지
  ETH:  "#627EEA"   # 이더리움 블루
  USDT: "#26A17B"   # 테더 그린
  USDC: "#2775CA"   # USDC 블루
  BNB:  "#F0B90B"   # 바이낸스 옐로
  SOL:  "#9945FF"   # 솔라나 퍼플
  XRP:  "#23292F"   # 리플 블랙
  ADA:  "#0033AD"   # 카르다노 다크블루
  DOGE: "#C3A634"   # 도지 골드
  default: "#5B7CFA"
```

### 2.1 의미 색상 (변동성 등급)

암호화폐 특성을 반영해 임계값이 다르다.

```yaml
volatility_grade:
  low:       "#43A047"   # < 50%
  moderate:  "#7CB342"   # 50~100%
  high:      "#FB8C00"   # 100~200%
  extreme:   "#E53935"   # > 200%
```

### 2.2 위험도 색상 (Volatility-Adjusted Risk Score 기반)

```yaml
risk_score_grade:
  safe:        "#43A047"   # 70~100
  moderate:    "#FBC02D"   # 40~69
  high_risk:   "#E53935"   # 0~39
```

---

## 3. 차트 세부 스타일 (암호화폐 특화)

### 3.1 라인 차트

```yaml
LineChart_crypto:
  stroke_width: 1.5
  smooth: false             # 분 단위 데이터는 보간 안함
  axis:
    x: { format: "MM-DD HH:mm" }
    y: { format: "0,0", grid: true }
  candle_mode_threshold: 5000   # 5000개 초과 시 캔들로 자동 전환
```

### 3.2 도넛 차트

```yaml
DonutChart_crypto:
  inner_radius_ratio: 0.65
  segment_grouping:
    - { name: "BTC",         match: ["BTC", "WBTC"] }
    - { name: "ETH",         match: ["ETH", "stETH"] }
    - { name: "스테이블코인",  match: ["USDT", "USDC", "DAI", "BUSD"] }
    - { name: "알트코인",      match: "*"     }   # 나머지
```

### 3.3 KPI 카드 — NVT 비율 전용

```yaml
KpiCard_NVT:
  show_grade_label: true
  grade_thresholds: [50, 150]
  grade_labels: ["저평가", "적정", "과대평가"]
```

---

## 4. 레이아웃

암호화폐 대시보드는 **시장 변동이 빈번**하므로 KPI 카드 갱신이 더 잦다.

```yaml
update_frequency:
  KPI:        "10s"      # 10초마다
  LineChart:  "60s"      # 1분마다
  Heatmap:    "5min"     # 5분마다
```

---

## 5. 적용 예시

### 5.1 입력: NVT 비율 = 87

```yaml
metric: nvt_ratio
value: 87
asset: BTC
```

### 5.2 자동 매핑

```javascript
{
  component: "KpiCard",
  props: {
    label: "NVT 비율 (BTC)",
    value: 87,
    grade_label: "적정",      // 50~150 구간
    color: "#F7931A",         // BTC 색상
    icon: "₿"
  }
}
```
