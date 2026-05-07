---
name: insight-rules
version: 1.0.0
domain: insight-forge-crypto
description: 암호화폐 지표를 평가하여 자연어 인사이트를 자동 생성하는 규칙
depends_on: [data-rules, metric-rules]
author: Insight Forge Team
last_updated: 2026-04-29
---

# 인사이트 생성 규칙 (insight-rules) — 암호화폐 도메인

본 문서는 암호화폐 시장 특성을 반영한 인사이트 생성 규칙을 정의한다. 일반 주식보다 변동성·위험 임계값이 다르며, 온체인 지표 기반 인사이트가 추가된다.

---

## 1. 변동성·위험 관련 규칙

### 1.1 극단 변동성 경보

```yaml
id: extreme_crypto_volatility
severity: critical
priority: 3
category: 위험
condition: volatility > 2.0
message: "변동성이 연환산 {volatility:.0%}로 매우 높습니다. 단일 종목 노출을 줄이거나 스테이블코인 비중을 검토하세요."
action_hint: "포트폴리오의 30% 이상을 스테이블코인으로 분산하는 방안을 검토하세요."
```

### 1.2 큰 낙폭 경보

```yaml
id: large_crypto_drawdown
severity: warning
priority: 12
category: 위험
condition: mdd < -0.5
message: "최대낙폭이 {mdd:.0%}에 도달했습니다. 암호화폐 평균 회복 기간은 1~2년이 소요될 수 있습니다."
action_hint: "추가 매수 시점 분할 검토 또는 손절 기준 재정립을 권장합니다."
```

### 1.3 안전 등급

```yaml
id: safe_crypto_portfolio
severity: success
priority: 60
category: 위험
condition: volatility_adjusted_risk_score >= 70
message: "변동성 조정 위험 점수 {volatility_adjusted_risk_score:int}점 — 암호화폐 포트폴리오로서 상대적으로 안정적입니다."
```

---

## 2. 펀더멘털 관련 규칙 (온체인 기반)

### 2.1 NVT 과대평가 경고

```yaml
id: high_nvt_warning
severity: warning
priority: 20
category: 펀더멘털
condition: nvt_ratio > 150
message: "NVT 비율이 {nvt_ratio:int}로 높은 수준입니다. 시가총액 대비 거래량이 적어 가격이 과대평가됐을 가능성이 있습니다."
```

### 2.2 NVT 저평가 신호

```yaml
id: low_nvt_signal
severity: info
priority: 45
category: 펀더멘털
condition: nvt_ratio < 50
message: "NVT 비율 {nvt_ratio:int} — 활발한 거래가 이루어지고 있어 시가총액 대비 저평가 구간일 수 있습니다."
```

### 2.3 네트워크 성장 신호

```yaml
id: network_growth_strong
severity: success
priority: 55
category: 펀더멘털
condition: active_address_momentum > 20
message: "활성 주소 수가 직전 90일 대비 {active_address_momentum:+.1f}% 증가했습니다. 네트워크가 활발히 성장 중입니다."
```

### 2.4 네트워크 사용자 이탈

```yaml
id: network_decline_warning
severity: warning
priority: 18
category: 펀더멘털
condition: active_address_momentum < -20
message: "활성 주소 수가 직전 90일 대비 {active_address_momentum:+.1f}% 감소했습니다. 네트워크 활동 둔화에 주의하세요."
action_hint: "온체인 데이터를 추가로 확인하여 일시적 현상인지 추세인지 판단하세요."
```

### 2.5 가격·펀더멘털 괴리

```yaml
id: fundamental_price_divergence
severity: warning
priority: 22
category: 펀더멘털
condition: fundamental_divergence > 0.5
message: "최근 30일 가격 상승({price_30d_change:.0%})이 네트워크 활동 증가({active_address_momentum:.0%})를 크게 앞섰습니다. 가격 과열 가능성을 주시하세요."
```

---

## 3. 포트폴리오 구성 관련 규칙

### 3.1 BTC 도미넌스 부족

```yaml
id: low_btc_dominance
severity: info
priority: 40
category: 분산
condition: btc_dominance < 0.2 AND total_assets > 1
message: "BTC 비중이 {btc_dominance:.0%}로 낮습니다. 알트코인 중심 구성으로 변동성이 더 클 수 있습니다."
```

### 3.2 스테이블코인 부재

```yaml
id: no_stablecoin
severity: info
priority: 38
category: 분산
condition: stablecoin_ratio == 0
message: "스테이블코인 비중이 0입니다. 시장 하락 시 헤지 수단을 보유하지 않은 상태입니다."
action_hint: "10~30%의 스테이블코인 비중 유지를 통한 변동성 관리를 검토하세요."
```

### 3.3 과도한 코인 간 상관

```yaml
id: high_crypto_correlation
severity: warning
priority: 25
category: 분산
condition: mean_correlation > 0.85
message: "보유 코인 간 평균 상관계수가 {mean_correlation:.2f}로 매우 높습니다. 분산 효과가 제한적입니다."
```

---

## 4. 적용 예시

### 4.1 입력 지표

```json
{
  "volatility": 0.95,
  "mdd": -0.42,
  "nvt_ratio": 165,
  "active_address_momentum": 25.3,
  "fundamental_divergence": 0.62,
  "volatility_adjusted_risk_score": 55,
  "btc_dominance": 0.45,
  "stablecoin_ratio": 0.10,
  "mean_correlation": 0.72,
  "price_30d_change": 0.35
}
```

### 4.2 트리거된 인사이트

```
[!] [warning] NVT 비율이 165로 높은 수준입니다. (priority 20)
[!] [warning] 최근 30일 가격 상승(35%)이 네트워크 활동 증가(25%)를 크게 앞섰습니다. (priority 22)
[O] [success] 활성 주소 수가 직전 90일 대비 +25.3% 증가했습니다. (priority 55)
```

같은 코어 시스템이지만, 본 번들의 규칙으로 인해 **암호화폐 특화 인사이트**가 자동 생성된다.
