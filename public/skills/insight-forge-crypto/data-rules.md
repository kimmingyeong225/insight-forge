---
name: data-rules
version: 1.0.0
domain: insight-forge-crypto
description: 암호화폐 raw 데이터를 시스템 표준 스키마로 정규화하는 규칙
author: Insight Forge Team
last_updated: 2026-04-29
---

# 데이터 정규화 규칙 (data-rules) — 암호화폐 도메인

본 문서는 암호화폐 거래소 데이터를 Insight Forge 코어 시스템이 인식하는 표준 스키마로 변환하는 규칙을 정의한다. 동일한 코어 시스템이 `insight-forge-default`(주식)와 본 번들(암호화폐) 모두를 처리할 수 있다.

---

## 1. 표준 스키마 정의

### 1.1 시계열 데이터 (Time Series)

암호화폐는 24시간 거래되므로 시간 단위가 더 세밀하다.

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `timestamp` | string (ISO 8601) | ✅ | 거래 시각 (UTC) |
| `symbol` | string | ✅ | 코인 심볼 (BTC, ETH 등) |
| `close` | number | ✅ | 종가 (USD 또는 KRW) |
| `volume_24h` | number | [불가] | 24시간 거래량 |
| `market_cap` | number | [불가] | 시가총액 |

### 1.2 온체인 데이터 (On-chain)

본 번들의 차별점이다. 주식에는 없는 온체인 지표를 다룬다.

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `active_addresses` | integer | [불가] | 활성 주소 수 |
| `transaction_count` | integer | [불가] | 거래 건수 |
| `hash_rate` | number | [불가] | 해시레이트 (PoW 코인) |
| `staking_ratio` | number (0~1) | [불가] | 스테이킹 비율 (PoS 코인) |

### 1.3 포트폴리오 데이터 (Portfolio)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `symbol` | string | ✅ | 코인 심볼 |
| `weight` | number (0~1) | ✅ | 포트폴리오 내 비중 |
| `quantity` | number | [불가] | 보유 수량 (소수점 8자리까지) |

---

## 2. 컬럼 매핑 규칙

```yaml
timestamp:
  - "timestamp"
  - "time"
  - "date"
  - "거래시각"
  - "datetime"

symbol:
  - "symbol"
  - "ticker"
  - "코인"
  - "asset"
  - "currency"

close:
  - "close"
  - "price"
  - "현재가"
  - "last_price"
  - "closing_price"

volume_24h:
  - "volume_24h"
  - "volume"
  - "vol_24h"
  - "거래량"
```

---

## 3. 시간대 처리

암호화폐는 글로벌 24시간 시장이므로 **모든 시각은 UTC로 정규화**한다.

| 입력 시간대 | 변환 |
|------------|------|
| KST (UTC+9) | UTC로 -9시간 |
| EST (UTC-5) | UTC로 +5시간 |
| 시간대 미지정 | UTC로 가정 (경고 발생) |

---

## 4. 결측치 처리

| 필드 | 처리 방식 |
|------|----------|
| `close` | **선형 보간** (24시간 거래로 인해 forward fill보다 적합) |
| `volume_24h` | 인접 24시간 평균값 |
| `active_addresses` | 직전 값 유지 |
| `timestamp`, `symbol` | 행 제거 |

---

## 5. 이상치 검증

### 5.1 가격 이상치

- 1시간 변동률 > 50% 또는 < -50%: **경고만 발생** (암호화폐는 변동성 큼)
- 1시간 변동률 > 200%: **이상치로 판단, 별도 표시**
- 음수 가격: **에러 발생**

### 5.2 거래량 이상치

- 평균 대비 100배 초과: **경고** (펌프 가능성)
- 0이 1시간 이상 지속: **거래소 점검 의심, 사용자 알림**

---

## 6. 적용 예시

### 6.1 입력 (CSV)

```
거래시각,코인,현재가,거래량
2026-04-29T09:00:00+09:00,BTC,98500000,12450
2026-04-29T10:00:00+09:00,BTC,98750000,11320
```

### 6.2 정규화 결과

```json
[
  {"timestamp": "2026-04-29T00:00:00Z", "symbol": "BTC", "close": 98500000, "volume_24h": 12450},
  {"timestamp": "2026-04-29T01:00:00Z", "symbol": "BTC", "close": 98750000, "volume_24h": 11320}
]
```

처리 내역:
- 한국어 컬럼 → 영문 표준 매핑
- KST → UTC 변환 (-9시간)
- timestamp 형식 정규화 (ISO 8601)
