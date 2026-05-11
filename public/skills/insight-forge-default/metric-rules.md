---
name: metric-rules
version: 1.0.0
domain: insight-forge-default
description: 정규화된 데이터로부터 분석 지표를 계산하는 규칙
depends_on: [data-rules]
author: Insight Forge Team
last_updated: 2026-04-29
---

# 지표 계산 규칙 (metric-rules)

이 문서는 정규화된 투자 데이터로부터 시스템이 계산할 수 있는 모든 지표를 정의한다. 각 지표는 **입력**, **출력**, **수식**, **단위**, **해석 기준**을 명시한다. 코어 시스템의 `metrics.ts` 모듈은 이 규칙을 읽어 자동으로 지표를 계산한다.

지표는 다음 4개 카테고리로 구성된다.

1. **기본 수익·위험 지표** — 보편적으로 쓰이는 표준 지표
2. **상대 성과 지표** — 벤치마크 대비 비교 지표
3. **포트폴리오 지표** — 다종목 보유 시 계산되는 지표
4. **Insight Forge 자체 정의 지표** — 본 시스템 고유의 차별화 지표

---

## 1. 기본 수익·위험 지표

> **[구현 참고 — Implementation Note]**
> 
> 본 문서의 수식에 사용된 통계 함수(`std`, `cov`, `min`, `max`, `mean` 등)는 안전한 수식 평가 라이브러리 `expr-eval`에 **기본 내장되어 있지 않다.** 따라서 코어 시스템의 `metrics.ts` 모듈에서 다음과 같이 별도의 커스텀 함수로 등록하여 평가 엔진에 주입해야 한다.
> 
> ```javascript
> // metrics.ts 예시
> import { Parser } from 'expr-eval';
> 
> const parser = new Parser();
> parser.functions.std  = (arr) => /* 표준편차 계산 */;
> parser.functions.cov  = (a, b) => /* 공분산 계산 */;
> parser.functions.mean = (arr) => /* 평균 계산 */;
> parser.functions.min  = (arr) => Math.min(...arr);
> parser.functions.max  = (arr) => Math.max(...arr);
> ```
> 
> 이렇게 주입한 후에야 `std(daily_return) * sqrt(252)` 같은 표현식이 정상 평가된다. AI가 본 문서를 보고 코드를 자동 생성할 때 이 단계를 누락하면 런타임 에러가 발생하므로 반드시 선행되어야 한다.

### 1.1 일별 수익률 (Daily Return)

- **정의**: 전일 종가 대비 당일 종가의 변동률
- **수식**: `(close[t] - close[t-1]) / close[t-1]`
- **입력**: `close` 시계열
- **출력**: `daily_return` 시계열 (소수)
- **단위**: 비율 (UI에서는 % 표시)
- **첫 영업일 처리**: `null`

### 1.2 누적 수익률 (Cumulative Return)

- **정의**: 시작 시점 대비 현재 시점까지의 총 수익률
- **수식**: `(close[t] / close[0]) - 1`
- **입력**: `close` 시계열
- **출력**: `cumulative_return` 시계열
- **단위**: 비율 (% 표시)

### 1.3 변동성 (Volatility)

- **정의**: 일별 수익률의 연율화된 표준편차
- **수식**: `std(daily_return) × √252`
- **상수 252**: 연간 영업일 수 (한국 주식시장 기준)
- **입력**: `daily_return` 시계열
- **출력**: 단일 값 (스칼라)
- **단위**: % (연율화)
- **해석 기준**:
  - 15% 미만: 낮은 변동성
  - 15~25%: 보통
  - 25~40%: 높은 변동성
  - 40% 이상: 매우 높은 변동성

### 1.4 최대낙폭 (Maximum Drawdown, MDD)

- **정의**: 기간 내 최고점 대비 최대 하락폭
- **수식**: 
  ```
  drawdown[t] = (close[t] - max(close[0..t])) / max(close[0..t])
  MDD = min(drawdown[0..T])
  ```
- **입력**: `close` 시계열
- **출력**: 단일 값 (음수)
- **단위**: % (음수)
- **해석 기준**:
  - -10% 이상 (즉, 0%에 가까울수록): 안정적
  - -10% ~ -20%: 보통
  - -20% ~ -30%: 주의
  - -30% 미만: 위험

### 1.5 샤프지수 (Sharpe Ratio)

- **정의**: 무위험수익률을 초과하는 단위 위험당 수익률
- **수식**: `(연환산_수익률 - 무위험_수익률) / 변동성`
- **무위험수익률 기본값**: `3.5%` (한국 국고채 1년물 기준)
- **입력**: `cumulative_return`, `volatility`
- **출력**: 단일 값 (스칼라)
- **단위**: 무차원 (비율)
- **해석 기준**:
  - 1.0 미만: 위험 대비 수익 부족
  - 1.0 ~ 1.5: 양호
  - 1.5 ~ 2.0: 우수
  - 2.0 이상: 탁월

---

## 2. 상대 성과 지표

벤치마크(예: KOSPI)와의 비교를 통해 계산되는 지표들이다.

### 2.1 베타 (Beta)

- **정의**: 시장 변동에 대한 종목/포트폴리오의 민감도
- **수식**: `cov(자산_수익률, 벤치마크_수익률) / var(벤치마크_수익률)`
- **입력**: 자산 일별 수익률, 벤치마크 일별 수익률
- **출력**: 단일 값
- **해석 기준**:
  - β < 1: 시장보다 변동성 작음 (방어적)
  - β = 1: 시장과 동일 움직임
  - β > 1: 시장보다 변동성 큼 (공격적)

### 2.2 알파 (Alpha)

- **정의**: 베타로 설명되지 않는 초과수익률
- **수식**: `자산_연수익률 - (무위험수익률 + 베타 × (벤치마크_연수익률 - 무위험수익률))`
- **입력**: 자산 수익률, 베타, 벤치마크 수익률, 무위험수익률
- **출력**: 단일 값
- **단위**: % (연율화)
- **해석 기준**: 양수이면 시장 대비 초과 성과

### 2.3 추적오차 (Tracking Error)

- **정의**: 자산 수익률과 벤치마크 수익률 차이의 표준편차
- **수식**: `std(자산_수익률 - 벤치마크_수익률) × √252`
- **단위**: % (연율화)
- **용도**: ETF·인덱스 펀드의 추종 충실도 평가

### 2.4 정보비율 (Information Ratio)

- **정의**: 추적오차 단위당 초과수익률
- **수식**: `(자산_연수익률 - 벤치마크_연수익률) / 추적오차`
- **출력**: 단일 값
- **해석 기준**: 0.5 이상이면 우수한 액티브 운용

---

## 3. 포트폴리오 지표

다종목 보유 시 계산되는 지표들이다.

### 3.1 가중 수익률 (Weighted Portfolio Return)

- **정의**: 보유 비중을 반영한 포트폴리오 전체 수익률
- **수식**: `Σ(weight[i] × return[i])` for all i in portfolio
- **입력**: 포트폴리오 비중, 각 종목 수익률
- **출력**: 시계열 또는 스칼라

### 3.2 종목 간 상관계수 (Correlation Matrix)

- **정의**: 종목 쌍별 일별 수익률의 상관관계
- **수식**: 표준 피어슨 상관계수 (-1 ~ +1)
- **입력**: 각 종목의 `daily_return` 시계열
- **출력**: N×N 상관행렬
- **용도**: 히트맵 시각화 + 분산투자 점수 계산

### 3.3 평균 상관계수 (Mean Correlation)

- **정의**: 상관행렬의 비대각 원소들의 평균
- **수식**: `mean(correlation_matrix[i,j])` where `i ≠ j`
- **출력**: 단일 값 (-1 ~ +1)
- **해석 기준**:
  - 0.3 미만: 분산 효과 우수
  - 0.3 ~ 0.6: 보통
  - 0.6 이상: 분산 효과 제한적

---

## 4. Insight Forge 자체 정의 지표 ⭐

본 시스템이 차별화를 위해 자체 정의한 5개 지표다. 모두 0~100 또는 명확한 범위로 정규화되어 사용자가 직관적으로 이해할 수 있다.

### 4.1 분산투자 점수 (Diversification Score)

분산이 얼마나 잘 되어있는지를 0~100점으로 표현한다.

- **정의**: 평균 상관계수를 역산한 분산투자 점수
- **수식**: 
  ```
  N = 포트폴리오 종목 수

  if N < 2:
      diversification_score = 0          # 분산 불가 (단일 종목)
  else:
      diversification_score = max(0, min(100, 100 × (1 - mean_correlation)))
  ```
- **입력**: `mean_correlation` (3.3 항목), `N` (포트폴리오 종목 수).  
  N ≥ 2일 때만 mean_correlation 사용; N < 2이면 분산 불가로 간주하여 0점 반환.
- **출력**: 단일 값 (0~100)
- **단위**: 점
- **해석 기준**:
  - N = 1 (단일 종목): 0점 (분산투자 불가)
  - 80점 이상: 매우 우수한 분산
  - 60~79점: 양호
  - 40~59점: 보통
  - 40점 미만: 분산 부족 (집중 투자)
- **차별성**: 평균 상관계수의 부호·크기를 사용자가 직관적으로 이해하기 어렵다는 한계를 극복

### 4.2 집중도 점수 (Concentration Score, HHI 기반)

포트폴리오가 얼마나 특정 종목에 집중되어 있는지를 측정한다. 허핀달-허쉬만 지수(HHI)를 응용한다.

- **정의**: 각 종목 비중의 제곱합 × 10000
- **수식**: 
  ```
  concentration_score = Σ(weight[i]²) × 10000
  ```
- **입력**: 포트폴리오의 모든 종목 `weight`
- **출력**: 단일 값 (0~10000)
- **단위**: HHI 단위
- **해석 기준** (미국 법무부 반독점 기준 차용):
  - 1500 미만: 높은 분산 (Unconcentrated)
  - 1500 ~ 2500: 보통 분산 (Moderately Concentrated)
  - 2500 초과: 고도 집중 (Highly Concentrated)
- **차별성**: 학술적·법률적으로 검증된 지표를 투자에 응용하여 신뢰성 확보

### 4.3 포트폴리오 건강도 (Portfolio Health Score)

샤프지수, MDD, 분산투자 점수, 변동성을 가중 평균한 종합 진단 지표다.

- **정의**: 4개 핵심 지표의 정규화된 가중 평균
- **수식**:
  ```
  health_score = 
      0.30 × sharpe_normalized
    + 0.30 × mdd_normalized
    + 0.20 × diversification_normalized
    + 0.20 × volatility_normalized
  ```
- **정규화 함수**:
  ```
  sharpe_normalized       = clip(sharpe_ratio × 50, 0, 100)
  mdd_normalized          = clip(100 + mdd × 333, 0, 100)   # MDD는 음수
  diversification_normalized = diversification_score          # 이미 0~100
  volatility_normalized   = clip(100 - volatility × 200, 0, 100)
  ```
- **출력**: 단일 값 (0~100)
- **해석 기준**:
  - 80점 이상: [O] 매우 건강
  - 60~79점: [~] 양호
  - 40~59점: [!] 주의
  - 40점 미만: [!!] 위험
- **차별성**: Insight Forge 고유의 종합 진단 점수. 4개 지표를 한 화면에 통합하여 사용자가 빠르게 상태를 파악할 수 있게 한다

### 4.4 위험조정수익률 (RAR, Risk-Adjusted Return)

샤프지수의 단순화 버전으로, 무위험수익률을 차감하지 않아 직관적으로 해석 가능하다.

- **정의**: 누적수익률을 변동성과 기간으로 정규화
- **수식**: 
  ```
  rar = cumulative_return / (volatility × √(period_days / 252))
  ```
- **입력**: `cumulative_return`, `volatility`, 분석 기간(일수)
- **출력**: 단일 값
- **단위**: 무차원
- **해석 기준**:
  - 0.5 미만: 위험 대비 수익 미흡
  - 0.5 ~ 1.0: 보통
  - 1.0 이상: 위험 대비 수익 우수
- **차별성**: 무위험수익률 가정에서 자유로워, 분석 시점·국가에 무관하게 적용 가능

### 4.5 모멘텀 강도 (Momentum Strength)

최근 단기 추세가 중장기 추세 대비 얼마나 강한지를 측정한다.

- **정의**: 최근 1개월 수익률과 직전 3개월 월평균 수익률의 차이
- **수식**:
  ```
  recent_1m_return     = (close[T] / close[T-21]) - 1
  prior_3m_avg_return  = mean of monthly returns in [T-84, T-21]
  momentum_strength    = (recent_1m_return - prior_3m_avg_return) × 100
  ```
- **상수 21**: 1개월 영업일 수
- **상수 84**: 4개월 영업일 수 (직전 3개월 + 최근 1개월)
- **출력**: 단일 값 (-100 ~ +100, 이론적)
- **단위**: % 포인트
- **해석 기준**:
  - +5 이상: 강한 상승 모멘텀
  - 0 ~ +5: 약한 상승 모멘텀
  - -5 ~ 0: 약한 하락 모멘텀
  - -5 이하: 강한 하락 모멘텀 (추세 전환 의심)
- **차별성**: 단순 수익률이 아닌 "추세의 가속/감속"을 포착하여 변곡점 감지에 유용

---

## 5. 지표 계산 순서 (Dependency Graph)

지표들 간의 의존 관계는 다음과 같다. 시스템은 이 순서를 따라 계산한다.

```
[Raw Data]
   ↓
daily_return ──┬── cumulative_return ──┐
               │                       ├── sharpe_ratio
               ├── volatility ─────────┤
               │                       ├── rar
               ├── mdd ────────────────┤
               │                       ├── beta ── alpha
               │                       ├── tracking_error ── information_ratio
               │                       │
               │                       └── health_score (종합)
               │
               └── correlation_matrix ── mean_correlation ── diversification_score
                                                            │
                                            weight_sum ─────┴── concentration_score
                                            
            close[T-84..T] ── momentum_strength
```

---

## 6. 계산 시점 및 캐싱 전략

| 지표 카테고리 | 재계산 트리거 | 캐싱 |
|--------------|--------------|------|
| 기본 지표 | 데이터 변경 시 | ✅ 캐시 |
| 상대 성과 지표 | 벤치마크 변경 시 | ✅ 캐시 |
| 포트폴리오 지표 | 비중 변경 시 | [불가] 즉시 계산 |
| 자체 정의 지표 | 의존 지표 변경 시 | ✅ 캐시 |

캐싱 키는 `${지표명}_${데이터해시}_${파라미터해시}` 형식을 사용한다.

---

## 7. 적용 예시

### 7.1 입력 (정규화된 포트폴리오)

```json
{
  "portfolio": [
    {"symbol": "005930", "weight": 0.4},
    {"symbol": "035420", "weight": 0.3},
    {"symbol": "035720", "weight": 0.3}
  ],
  "period": "2025-04-29 ~ 2026-04-29"
}
```

### 7.2 출력 (계산된 지표)

```json
{
  "basic": {
    "cumulative_return": 0.142,
    "volatility": 0.218,
    "mdd": -0.156,
    "sharpe_ratio": 1.12
  },
  "relative": {
    "beta": 1.08,
    "alpha": 0.034,
    "information_ratio": 0.61
  },
  "portfolio": {
    "mean_correlation": 0.42,
    "weighted_return": 0.142
  },
  "insight_forge": {
    "diversification_score": 58,
    "concentration_score": 3400,
    "health_score": 67,
    "rar": 0.89,
    "momentum_strength": 3.2
  }
}
```

### 7.3 사용자에게 표시되는 핵심 메시지

```
[차트] 포트폴리오 건강도: 67점 ([~] 양호)
   - 위험 대비 수익(샤프): 1.12 ✅ 양호
   - 분산 투자 점수: 58점 (보통)
   - 집중도: 3400 ([주의] 고도 집중)
   - 모멘텀 강도: +3.2pt (약한 상승)
```
