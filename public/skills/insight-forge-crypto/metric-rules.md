---
name: metric-rules
version: 1.0.0
domain: insight-forge-crypto
description: 암호화폐 데이터로부터 분석 지표를 계산하는 규칙
depends_on: [data-rules]
author: Insight Forge Team
last_updated: 2026-04-29
---

# 지표 계산 규칙 (metric-rules) — 암호화폐 도메인

본 문서는 암호화폐 데이터에 특화된 지표를 정의한다. 주식 도메인의 `insight-forge-default`와 동일한 코어 시스템을 사용하지만, 지표 자체는 암호화폐의 특성(24시간 거래, 온체인 데이터, 극심한 변동성)을 반영한다.

---

## 1. 기본 수익·위험 지표

### 1.1 시간별 수익률 (Hourly Return)

암호화폐는 일별이 아닌 시간별 수익률을 사용한다.

- **수식**: `(close[t] - close[t-1]) / close[t-1]`
- **단위**: %

### 1.2 변동성 (Volatility) — 암호화폐 특화

연율화 시 **8760시간**(365일 × 24시간)을 사용한다.

- **수식**: `std(hourly_return) × √8760`
- **상수 8760**: 24/7 거래 환경 반영 (주식의 252일 대비)
- **단위**: % (연율화)
- **해석 기준** (암호화폐 특성 반영):
  - 50% 미만: 매우 낮은 변동성 (BTC·ETH 안정 시)
  - 50~100%: 보통 (메이저 코인 평균)
  - 100~200%: 높음 (알트코인)
  - 200% 이상: 매우 높음 (밈코인·신생 코인)

### 1.3 최대낙폭 (MDD)

- **수식**: 주식과 동일
- **해석 기준** (암호화폐는 더 관대):
  - -30% 이상 (즉, 0%에 가까울수록): 안정적
  - -30% ~ -50%: 보통
  - -50% ~ -70%: 주의
  - -70% 이하: 위험

---

## 2. 암호화폐 특화 자체 지표 ⭐

### 2.1 NVT 비율 (Network Value to Transactions)

암호화폐의 PER 격이라 불리는 지표다. 주식의 PER처럼 가격 적정성을 평가한다.

- **정의**: 시가총액을 일일 거래량으로 나눈 값
- **수식**: 
  ```
  nvt_ratio = market_cap / volume_24h
  ```
- **해석 기준**:
  - 50 미만: 저평가 (활발한 거래)
  - 50 ~ 150: 적정
  - 150 초과: 과대평가 의심
- **차별성**: 주식 도메인에서는 계산 불가능한 암호화폐 고유 지표

### 2.2 활성 주소 모멘텀 (Active Address Momentum)

네트워크 사용자 수의 변화로 펀더멘털을 측정한다.

- **정의**: 최근 30일 활성 주소 수 평균과 직전 90일 평균의 비율
- **수식**: 
  ```
  recent_30d_avg = mean(active_addresses[T-30..T])
  prior_90d_avg  = mean(active_addresses[T-120..T-30])
  active_address_momentum = (recent_30d_avg / prior_90d_avg - 1) × 100
  ```
- **출력**: % (양수면 사용자 증가, 음수면 감소)
- **해석 기준**:
  - +20% 이상: 강한 네트워크 성장
  - 0 ~ +20%: 안정적 성장
  - -20% ~ 0: 정체
  - -20% 이하: 사용자 이탈 (주의)
- **차별성**: 주식의 매출 성장률과 유사한 펀더멘털 지표를 온체인으로 구현

### 2.3 변동성 조정 위험도 (Volatility-Adjusted Risk Score)

암호화폐는 변동성이 워낙 커서 일반 위험 지표가 무력화된다. 0~100점으로 정규화.

- **수식**:
  ```
  v_score   = clip(100 - volatility × 50, 0, 100)    # 변동성 200% = 0점
  m_score   = clip(100 + mdd × 142, 0, 100)          # MDD -70% = 0점
  risk_score = (v_score + m_score) / 2
  ```
- **해석 기준**:
  - 70 이상: [O] 상대적으로 안전
  - 40~69: [~] 일반적 암호화폐 위험
  - 40 미만: [!!] 고위험

### 2.4 펀더멘털·가격 괴리도 (Fundamental Divergence)

NVT 비율과 활성 주소 모멘텀을 결합하여 가격 적정성을 평가한다.

- **수식**:
  ```
  divergence = (price_30d_change / 100) - (active_address_momentum / 100)
  ```
- **출력**: -2 ~ +2 범위
- **해석 기준**:
  - +0.5 초과: 펀더멘털 대비 가격 과열
  - -0.5 ~ +0.5: 균형
  - -0.5 미만: 저평가 의심
- **차별성**: 가격과 네트워크 활동의 디커플링을 정량화

---

## 3. 포트폴리오 지표

암호화폐 포트폴리오의 특수성을 반영한다.

### 3.1 BTC 도미넌스 (BTC Dominance)

포트폴리오 내 비트코인 비중. 암호화폐 시장 분석의 핵심 지표.

- **수식**: `weight_btc / Σ(weight)`
- **해석**: 50% 이상이면 보수적, 20% 미만이면 알트 중심

### 3.2 스테이블코인 비중

- **수식**: `Σ(weight[i])` for i in stablecoins (USDT, USDC 등)
- **해석**: 헤지·관망 비율의 척도

### 3.3 평균 상관계수

- 주식과 동일한 계산. 단, 암호화폐는 일반적으로 상관계수가 더 높음(0.7+ 흔함)

---

## 4. 적용 예시

### 4.1 입력 (포트폴리오)

```json
{
  "portfolio": [
    {"symbol": "BTC", "weight": 0.5},
    {"symbol": "ETH", "weight": 0.3},
    {"symbol": "USDT", "weight": 0.2}
  ]
}
```

### 4.2 출력 (계산된 지표)

```json
{
  "basic": {
    "volatility": 0.85,
    "mdd": -0.45,
    "hourly_return_30d_avg": 0.0008
  },
  "crypto_specific": {
    "nvt_ratio_btc": 87,
    "active_address_momentum_eth": 12.4,
    "volatility_adjusted_risk_score": 62,
    "fundamental_divergence_btc": -0.15
  },
  "portfolio": {
    "btc_dominance": 0.50,
    "stablecoin_ratio": 0.20,
    "mean_correlation": 0.78
  }
}
```
