---
name: insight-rules
version: 1.0.0
domain: insight-forge-default
description: 계산된 지표를 평가하여 자연어 인사이트를 자동 생성하는 규칙
depends_on: [data-rules, metric-rules]
author: Insight Forge Team
last_updated: 2026-04-29
---

# 인사이트 생성 규칙 (insight-rules)

이 문서는 계산된 지표 값을 평가하여 사용자에게 **자연어 진단 메시지**를 생성하는 규칙을 정의한다. 코어 시스템의 `insights.ts` 모듈은 이 규칙을 읽어 조건이 충족될 때 해당 메시지를 인사이트 카드로 출력한다.

설계 원칙은 다음 4가지다.

1. **조건 → 메시지 형태** — 모든 규칙은 명확한 트리거 조건을 가진다
2. **심각도 구분** — `critical` / `warning` / `info` / `success` 4단계
3. **우선순위 정렬** — 여러 규칙이 동시에 트리거되면 우선순위 순으로 표시
4. **변수 치환** — 메시지에 실제 계산값을 동적으로 삽입

---

## 1. 인사이트 카드 구조

각 인사이트는 다음 필드를 갖는다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 규칙 고유 식별자 |
| `severity` | enum | `critical` / `warning` / `info` / `success` |
| `priority` | integer | 1~100, 낮을수록 우선 표시 |
| `condition` | expression | 트리거 조건식 |
| `message` | string \| multiline | 자연어 메시지 — 3단 구조(원인/영향/권장) 권장 |
| `action_hint` | string | (deprecated) 권장 행동 — message 내 `권장:` 줄로 흡수. 구버전 호환 유지 |
| `category` | string | 분류 태그 (위험/수익/분산 등) |

### 1.1 message 3단 구조 (권장 양식)

`message` 필드는 다음 형식의 multi-line 문자열로 작성한다.

```
{lead 줄 — 수치를 포함한 사실 진술}

원인: {조건이 트리거된 본질적 이유}
영향: {이 상태가 의미하는 바}
권장: {사용자가 취할 다음 행동}
```

- `lead` 줄은 반드시 수치를 포함한 한 줄 사실 진술
- `원인 / 영향 / 권장` 세 줄은 각각 선택적이며, 라벨은 한국어로 통일
- success 등급은 일반적으로 `권장`이 생략됨
- `action_hint`는 deprecated — 새 규칙에서는 message 안의 `권장:` 줄로 통합

### 1.2 변수 치환 규칙

메시지 내 `{변수명}` 또는 `{변수명:포맷}` 으로 동적 값 삽입.

| 포맷 지정자 | 예시 | 결과 |
|-------------|------|------|
| `{value}` | `value=0.142` | `0.142` |
| `{value:.1%}` | `value=0.142` | `14.2%` |
| `{value:.2f}` | `value=1.235` | `1.24` |
| `{value:+.1%}` | `value=0.05` | `+5.0%` |
| `{value:int}` | `value=58.7` | `59` |

### 1.3 심각도별 시각 표현

| 심각도 | 아이콘 | 색상 | 사용 기준 |
|--------|--------|------|-----------|
| `critical` | [!!] | `var(--danger)` | 즉시 조치 필요 |
| `warning` | [!] | `var(--warning)` | 주의 환기 |
| `info` | [i] | `var(--info)` | 참고 정보 |
| `success` | [O] | `var(--success)` | 긍정적 진단 |

---

## 2. 위험·변동성 관련 규칙

### 2.1 변동성 경고

```yaml
id: high_volatility_vs_benchmark
severity: warning
priority: 20
category: 위험
condition: portfolio_volatility / benchmark_volatility > 1.3
message: |
  포트폴리오 변동성이 벤치마크 대비 {ratio:.1f}배 높습니다.

  원인: 변동성이 25%를 초과하는 종목이 포함되어 있습니다
  영향: 벤치마크 대비 가격 변동 폭이 크게 나타날 수 있습니다
  권장: 변동성이 큰 종목 비중을 줄이거나 안정 자산을 추가하세요
```

### 2.2 극단적 변동성 경보

```yaml
id: extreme_volatility
severity: critical
priority: 5
category: 위험
condition: portfolio_volatility > 0.40
message: |
  연환산 변동성이 {volatility:.1%}로 매우 높습니다.

  원인: 연환산 변동성이 40%를 초과했습니다
  영향: 단기 하락 시 큰 평가손실 발생 위험
  권장: 방어주·채권 ETF·현금성 자산 비중 확대를 고려하세요
```

### 2.3 큰 낙폭 발생

```yaml
id: significant_drawdown
severity: critical
priority: 3
category: 위험
condition: mdd < -0.25
message: |
  최대낙폭이 {mdd:.1%}로 -25%를 초과했습니다.

  원인: 최대낙폭이 -25%를 초과했습니다
  영향: 본래 가치 회복까지 1년 이상 소요 가능
  권장: 손실 회피보다 장기 회복 전략 수립을 권장합니다 (평단가 분석)
```

### 2.4 안정적 변동성

```yaml
id: stable_volatility
severity: success
priority: 60
category: 위험
condition: portfolio_volatility < 0.15
message: |
  연환산 변동성이 {volatility:.1%}로 안정적입니다.

  영향: 연환산 변동성이 15% 미만으로 위험 관리가 잘 이루어지고 있습니다
```

---

## 3. 수익·성과 관련 규칙

### 3.1 우수한 샤프지수

```yaml
id: excellent_sharpe
severity: success
priority: 50
category: 수익
condition: sharpe_ratio > 1.5
message: |
  샤프지수가 {sharpe_ratio:.2f}로 우수합니다.

  영향: 샤프지수 1.5 이상으로 위험 대비 수익률이 양호합니다
```

### 3.2 부진한 샤프지수

```yaml
id: poor_sharpe
severity: warning
priority: 25
category: 수익
condition: sharpe_ratio < 0.5
message: |
  샤프지수가 {sharpe_ratio:.2f}로 낮습니다.

  원인: 위험 대비 수익률이 임계값(0.5) 미만
  영향: 감수한 변동성 대비 수익 효율 저하
  권장: 수익률이 낮거나 변동성이 큰 종목을 점검하세요
```

### 3.3 벤치마크 초과 성과

```yaml
id: alpha_positive
severity: success
priority: 55
category: 수익
condition: alpha > 0.03
message: |
  벤치마크 대비 연 {alpha:+.1%}의 초과 성과를 기록 중입니다.

  영향: 벤치마크 대비 초과 성과를 기록 중 — 우수한 운용 효율입니다
```

### 3.4 벤치마크 하회

```yaml
id: alpha_negative
severity: info
priority: 40
category: 수익
condition: alpha < -0.03
message: |
  벤치마크 대비 연 {alpha:+.1%} 부진합니다.

  원인: 벤치마크 대비 수익률이 3% 이상 부진합니다
  영향: 종목 선정·비중 조정 효과를 재검토할 시점
  권장: 벤치마크 추종 또는 종목 교체 여부를 검토하세요
```

---

## 4. 분산·집중도 관련 규칙

### 4.1 분산 투자 부족

```yaml
id: low_diversification
severity: warning
priority: 22
category: 분산
condition: diversification_score < 40
message: |
  분산투자 점수가 {diversification_score:int}점으로 낮습니다.

  원인: 보유 종목 간 상관관계가 높아 분산 효과가 제한적입니다
  영향: 시장 충격에 종목들이 함께 움직일 가능성
  권장: 다른 섹터·자산군의 종목을 추가하면 분산 효과가 개선됩니다
```

### 4.2 우수한 분산 투자

```yaml
id: good_diversification
severity: success
priority: 65
category: 분산
condition: diversification_score >= 70
message: |
  분산투자 점수 {diversification_score:int}점입니다.

  영향: 종목 간 상관관계가 낮아 효율적인 분산이 이루어지고 있습니다
```

### 4.3 과도한 집중도

```yaml
id: high_concentration
severity: warning
priority: 18
category: 분산
condition: concentration_score > 2500
message: |
  포트폴리오 집중도(HHI)가 {concentration_score:int}로 고도 집중 구간입니다.

  원인: HHI 집중도가 2500을 초과하여 고도 집중 구간입니다
  영향: 단일 종목 위험에 노출됩니다
  권장: 최대 비중 종목의 비중을 30% 이하로 조정하는 것을 권장합니다
```

### 4.4 단일 종목 과대 비중

```yaml
id: single_stock_overweight
severity: critical
priority: 8
category: 분산
condition: max_single_weight > 0.5
message: |
  단일 종목이 포트폴리오의 {max_single_weight:.0%}를 차지하고 있습니다.

  원인: 단일 종목이 포트폴리오의 50% 이상을 차지합니다
  영향: 해당 종목 가격 변동에 포트폴리오 전체가 노출됩니다
  권장: 비중을 30~40% 수준으로 낮추는 분할 매도를 검토하세요
```

---

## 5. 종합 건강도 관련 규칙

### 5.1 매우 건강한 포트폴리오

```yaml
id: excellent_health
severity: success
priority: 70
category: 종합
condition: health_score >= 80
message: |
  포트폴리오 건강도 {health_score:int}점 — 매우 건강한 상태입니다.

  영향: 수익성·위험·분산 3개 축이 모두 균형 잡혀 있습니다
```

### 5.2 건강도 위험 신호

```yaml
id: critical_health
severity: critical
priority: 1
category: 종합
condition: health_score < 40
message: |
  포트폴리오 건강도가 {health_score:int}점으로 위험 수준입니다.

  원인: 4개 핵심 지표 중 다수가 임계치를 벗어났습니다
  영향: 단일 지표 악화가 아닌 구조적 문제일 가능성
  권장: 각 세부 지표의 인사이트 카드를 우선 확인하세요
```

---

## 6. 모멘텀 관련 규칙

### 6.1 강한 상승 모멘텀

```yaml
id: strong_upward_momentum
severity: info
priority: 45
category: 추세
condition: momentum_strength > 5
message: |
  최근 1개월 추세가 직전 3개월 평균 대비 {momentum_strength:+.1f}pt 강합니다.

  원인: 최근 1개월 추세가 직전 3개월 평균 대비 +5pt 이상 강함
  영향: 상승 가속 구간 — 단기 과열 가능성도 존재
  권장: 진입 시점이라면 단기 조정 가능성을 함께 검토하세요
```

### 6.2 추세 전환 의심

```yaml
id: momentum_reversal
severity: warning
priority: 28
category: 추세
condition: momentum_strength < -5
message: |
  최근 1개월 추세가 직전 3개월 평균 대비 {momentum_strength:+.1f}pt 약화됐습니다.

  원인: 최근 1개월 추세가 직전 3개월 평균 대비 -5pt 이상 약화
  영향: 추세 전환 가능성 — 하락 가속 위험
  권장: 지지선·이동평균선 이탈 여부를 추가로 확인하세요
```

---

## 7. RAR(위험조정수익률) 관련 규칙

### 7.1 우수한 위험조정수익률

```yaml
id: excellent_rar
severity: success
priority: 58
category: 수익
condition: rar > 1.0
message: |
  위험조정수익률(RAR)이 {rar:.2f}로 우수합니다.

  영향: 위험조정수익률(RAR) 1.0 이상으로 위험 대비 수익이 충분합니다
```

### 7.2 미흡한 위험조정수익률

```yaml
id: poor_rar
severity: info
priority: 42
category: 수익
condition: rar < 0.5
message: |
  위험조정수익률(RAR)이 {rar:.2f}로 낮은 편입니다.

  원인: 위험조정수익률(RAR)이 0.5 미만
  영향: 변동성 대비 수익이 미흡한 구간
  권장: 변동성을 낮추거나 더 효율적인 종목 구성을 검토하세요
```

---

## 8. 데이터 품질 관련 규칙

### 8.1 데이터 품질 경고

```yaml
id: low_data_quality
severity: warning
priority: 15
category: 시스템
condition: data_quality_score < 70
message: |
  분석 데이터의 품질 점수가 {data_quality_score:int}점입니다.

  원인: 분석 데이터의 결측·이상치가 일부 포함되어 있습니다
  영향: 지표 계산 결과의 신뢰도 저하
  권장: 원본 데이터의 결측 구간을 확인하고 필요 시 보완하세요
```

### 8.2 분석 기간 부족

```yaml
id: insufficient_period
severity: info
priority: 35
category: 시스템
condition: analysis_period_days < 60
message: |
  분석 기간이 {analysis_period_days}일로 짧습니다.

  영향: 일부 지표(샤프지수·MDD 등)는 충분한 데이터 축적 후 더 신뢰할 수 있습니다
```

---

## 9. 우선순위 정렬 및 표시 규칙

### 9.1 표시 개수 제한

| 화면 위치 | 최대 표시 개수 |
|----------|---------------|
| 대시보드 상단 (긴급) | `critical` 중 최대 2개 |
| 대시보드 사이드바 | 모든 심각도 통합 최대 6개 |
| 인사이트 패널 | 전체 (스크롤) |

### 9.2 정렬 우선순위

다음 순서로 정렬한다.

1. `severity` 등급 (`critical` > `warning` > `info` > `success`)
2. `priority` 값 (낮을수록 위)
3. 규칙 id (사전순)

### 9.3 중복·충돌 처리

같은 카테고리에서 상반된 메시지가 모두 트리거될 경우 (예: `excellent_sharpe`와 `poor_sharpe`는 조건상 동시 발생 불가하므로 문제 없음), 만약 발생 시 `priority`가 낮은 쪽만 표시한다.

---

## 10. 적용 예시

### 10.1 입력 (계산된 지표)

```json
{
  "portfolio_volatility": 0.32,
  "benchmark_volatility": 0.20,
  "mdd": -0.18,
  "sharpe_ratio": 0.85,
  "alpha": 0.02,
  "diversification_score": 35,
  "concentration_score": 3200,
  "max_single_weight": 0.42,
  "health_score": 52,
  "momentum_strength": 6.5,
  "rar": 0.78,
  "data_quality_score": 92,
  "analysis_period_days": 252
}
```

### 10.2 트리거된 규칙들 (lead 줄 미리보기)

| id | severity | priority | lead 줄 |
|----|----------|----------|---------|
| `low_diversification` | warning | 22 | "분산투자 점수가 35점으로 낮습니다." |
| `high_concentration` | warning | 18 | "포트폴리오 집중도(HHI)가 3200으로 고도 집중 구간입니다." |
| `high_volatility_vs_benchmark` | warning | 20 | "포트폴리오 변동성이 벤치마크 대비 1.6배 높습니다." |
| `strong_upward_momentum` | info | 45 | "최근 1개월 추세가 직전 3개월 평균 대비 +6.5pt 강합니다." |

### 10.3 정렬·표시 결과 (대시보드 사이드바, 3단 구조)

```
[!] [warning] 포트폴리오 집중도(HHI)가 3200으로 고도 집중 구간입니다.
              원인: HHI 집중도가 2500을 초과하여 고도 집중 구간입니다
              영향: 단일 종목 위험에 노출됩니다
              권장: 최대 비중 종목의 비중을 30% 이하로 조정하세요

[!] [warning] 분산투자 점수가 35점으로 낮습니다.
              원인: 보유 종목 간 상관관계가 높아 분산 효과가 제한적입니다
              영향: 시장 충격에 종목들이 함께 움직일 가능성
              권장: 다른 섹터·자산군의 종목을 추가하면 분산 효과가 개선됩니다

[i] [info]    최근 1개월 추세가 직전 3개월 평균 대비 +6.5pt 강합니다.
              원인: 최근 1개월 추세가 직전 3개월 평균 대비 +5pt 이상 강함
              영향: 상승 가속 구간 — 단기 과열 가능성도 존재
              권장: 진입 시점이라면 단기 조정 가능성을 함께 검토하세요
```

---

## 11. 규칙 추가 가이드

### 11.1 새 규칙을 추가할 때 체크리스트

- [ ] 고유한 `id` 부여 (스네이크 케이스, 의미 명확)
- [ ] `condition`은 `metric-rules.md`에 정의된 변수만 사용
- [ ] `priority`는 기존 규칙들과 충돌하지 않도록 배치
- [ ] `message`는 3단 구조 (`lead` + `원인 / 영향 / 권장`) 권장
- [ ] `category` 태그로 분류 일관성 유지

### 11.2 권장 우선순위 범위

| 범위 | 용도 |
|------|------|
| 1~10 | 즉시 조치 필요한 critical 위험 |
| 11~20 | 중요한 warning |
| 21~30 | 일반적인 warning |
| 31~50 | info 정보성 |
| 51~70 | 긍정적 success |
| 71~100 | 부가적·맥락적 인사이트 |
