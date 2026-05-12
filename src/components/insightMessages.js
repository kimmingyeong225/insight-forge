/**
 * 인사이트 ID → 3단 구조(원인 / 영향 / 권장) 매핑 테이블
 *
 * src/core/insights.js는 첫 줄(수치 포함 사실 진술)만 생성한다.
 * InsightCard는 이 테이블을 lookup하여 원인·영향·권장을 보강 렌더링한다.
 *
 * 매핑이 없는 ID는 backward-compat 경로(기존 message + action)로 처리된다.
 *
 * 변경 시 동시에 갱신할 곳:
 *   - public/skills/insight-forge-default/insight-rules.md
 *   - public/skills/insight-forge-crypto/insight-rules.md
 *   (문서 톤 정합성 — 시스템 동작에는 영향 없음)
 */

export const INSIGHT_MESSAGES = {
  // === default 번들 ===

  excellent_health: {
    impact: '수익성·위험·분산 3개 축이 모두 균형 잡혀 있습니다',
  },
  critical_health: {
    cause: '4개 핵심 지표 중 다수가 임계치를 벗어났습니다',
    impact: '단일 지표 악화가 아닌 구조적 문제일 가능성',
    action: '각 세부 지표의 인사이트 카드를 우선 확인하세요',
  },

  extreme_volatility: {
    cause: '연환산 변동성이 40%를 초과했습니다',
    impact: '단기 하락 시 큰 평가손실 발생 위험',
    action: '방어주·채권 ETF·현금성 자산 비중 확대를 고려하세요',
  },
  high_volatility: {
    cause: '변동성이 25%를 초과하는 종목이 포함되어 있습니다',
    impact: '벤치마크 대비 가격 변동 폭이 크게 나타날 수 있습니다',
    action: '변동성이 큰 종목 비중을 줄이거나 안정 자산을 추가하세요',
  },
  stable_volatility: {
    impact: '연환산 변동성이 15% 미만으로 위험 관리가 잘 이루어지고 있습니다',
  },

  significant_drawdown: {
    cause: '최대낙폭이 -25%를 초과했습니다',
    impact: '본래 가치 회복까지 1년 이상 소요 가능',
    action: '손실 회피보다 장기 회복 전략 수립을 권장합니다 (평단가 분석)',
  },

  single_stock_overweight: {
    cause: '단일 종목이 포트폴리오의 50% 이상을 차지합니다',
    impact: '해당 종목 가격 변동에 포트폴리오 전체가 노출됩니다',
    action: '비중을 30~40% 수준으로 낮추는 분할 매도를 검토하세요',
  },
  low_diversification: {
    cause: '보유 종목 간 상관관계가 높아 분산 효과가 제한적입니다',
    impact: '시장 충격에 종목들이 함께 움직일 가능성',
    action: '다른 섹터·자산군의 종목을 추가하면 분산 효과가 개선됩니다',
  },
  good_diversification: {
    impact: '종목 간 상관관계가 낮아 효율적인 분산이 이루어지고 있습니다',
  },
  high_concentration: {
    cause: 'HHI 집중도가 2500을 초과하여 고도 집중 구간입니다',
    impact: '단일 종목 위험에 노출됩니다',
    action: '최대 비중 종목의 비중을 30% 이하로 조정하는 것을 권장합니다',
  },

  alpha_positive: {
    impact: '벤치마크 대비 초과 성과를 기록 중 — 우수한 운용 효율입니다',
  },
  alpha_negative: {
    cause: '벤치마크 대비 수익률이 3% 이상 부진합니다',
    impact: '종목 선정·비중 조정 효과를 재검토할 시점',
    action: '벤치마크 추종 또는 종목 교체 여부를 검토하세요',
  },

  excellent_sharpe: {
    impact: '샤프지수 1.5 이상으로 위험 대비 수익률이 양호합니다',
  },
  poor_sharpe: {
    cause: '위험 대비 수익률이 임계값(0.5) 미만',
    impact: '감수한 변동성 대비 수익 효율 저하',
    action: '수익률이 낮거나 변동성이 큰 종목을 점검하세요',
  },

  excellent_rar: {
    impact: '위험조정수익률(RAR) 1.0 이상으로 위험 대비 수익이 충분합니다',
  },
  poor_rar: {
    cause: '위험조정수익률(RAR)이 0.5 미만',
    impact: '변동성 대비 수익이 미흡한 구간',
    action: '변동성을 낮추거나 더 효율적인 종목 구성을 검토하세요',
  },

  strong_momentum: {
    cause: '최근 1개월 추세가 직전 3개월 평균 대비 +5pt 이상 강함',
    impact: '상승 가속 구간 — 단기 과열 가능성도 존재',
    action: '진입 시점이라면 단기 조정 가능성을 함께 검토하세요',
  },
  momentum_reversal: {
    cause: '최근 1개월 추세가 직전 3개월 평균 대비 -5pt 이상 약화',
    impact: '추세 전환 가능성 — 하락 가속 위험',
    action: '지지선·이동평균선 이탈 여부를 추가로 확인하세요',
  },

  low_data_quality: {
    cause: '분석 데이터의 결측·이상치가 일부 포함되어 있습니다',
    impact: '지표 계산 결과의 신뢰도 저하',
    action: '원본 데이터의 결측 구간을 확인하고 필요 시 보완하세요',
  },

  // === crypto 번들 ===

  extreme_crypto_volatility: {
    cause: '연환산 변동성이 200%를 초과했습니다',
    impact: '단기 ±50% 이상 변동도 가능한 고위험 구간',
    action: '포트폴리오의 30% 이상을 스테이블코인으로 분산하는 방안을 검토하세요',
  },
  high_crypto_volatility: {
    cause: '연환산 변동성이 100%를 초과합니다',
    impact: '암호화폐 평균 대비 가격 변동이 큽니다',
    action: '비중이 큰 코인의 분할 매도 또는 헤지를 검토하세요',
  },

  large_crypto_drawdown: {
    cause: '최대낙폭이 -50%를 초과했습니다',
    impact: '암호화폐 평균 회복 기간은 1~2년이 소요될 수 있습니다',
    action: '추가 매수 시점 분할 또는 손절 기준 재정립을 권장합니다',
  },

  safe_crypto: {
    impact: '변동성 조정 위험 점수가 70점 이상 — 암호화폐 포트폴리오로서 상대적으로 안정적입니다',
  },

  high_nvt_warning: {
    cause: 'NVT 비율이 150을 초과 — 시가총액 대비 거래량이 부족합니다',
    impact: '가격이 펀더멘털 대비 과대평가됐을 가능성',
    action: '거래량 추이를 함께 확인하여 조정 가능성을 평가하세요',
  },
  low_nvt_signal: {
    impact: '활발한 거래가 시가총액 대비 저평가 구간일 가능성을 시사합니다',
  },

  network_growth_strong: {
    impact: '활성 주소 수가 직전 90일 대비 +20% 이상 증가 — 네트워크가 활발히 성장 중입니다',
  },
  network_decline: {
    cause: '활성 주소 수가 직전 90일 대비 -20% 이상 감소',
    impact: '네트워크 활동 둔화 — 펀더멘털 약화 신호',
    action: '온체인 데이터를 추가 확인하여 일시적 현상인지 추세인지 판단하세요',
  },

  fundamental_divergence: {
    cause: '가격 상승이 네트워크 활동 증가를 크게 앞섰습니다',
    impact: '펀더멘털과의 괴리 — 가격 과열 가능성',
    action: '온체인 지표(거래량·활성주소) 추이를 추가 확인하세요',
  },

  no_stablecoin: {
    cause: '스테이블코인 비중이 0',
    impact: '시장 하락 시 헤지 수단 부재',
    action: '10~30%의 스테이블코인 비중 유지를 검토하세요',
  },
  low_btc_dominance: {
    cause: 'BTC 비중이 20% 미만 — 알트코인 중심 구성',
    impact: '암호화폐 평균보다 변동성이 더 클 수 있습니다',
    action: 'BTC·ETH 등 메이저 코인 비중 확대를 검토하세요',
  },
  high_crypto_correlation: {
    cause: '보유 코인 간 평균 상관계수가 0.85를 초과',
    impact: '같은 시장 충격에 함께 움직이는 분산 효과 제한',
    action: '상관관계가 낮은 자산군(스테이블·메이저) 비중을 늘리세요',
  },
};

/**
 * message 내부에 "원인: / 영향: / 권장:" prefix가 직접 포함된 경우 파싱.
 * 사용자가 향후 .md에서 message를 multi-line으로 직접 작성하는 경로를 지원한다.
 *
 * @param {string} message
 * @returns {{ lead: string, cause?: string, impact?: string, action?: string } | null}
 */
export function parseStructuredMessage(message) {
  if (!message || typeof message !== 'string') return null;
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const result = { lead: lines[0] };
  let matched = false;
  for (const line of lines.slice(1)) {
    const m = line.match(/^\[?(원인|영향|권장)\]?\s*[:：]\s*(.+)$/);
    if (m) {
      matched = true;
      const key = m[1] === '원인' ? 'cause' : m[1] === '영향' ? 'impact' : 'action';
      result[key] = m[2].trim();
    }
  }
  return matched ? result : null;
}

/**
 * insight 객체에서 3단 구조 데이터를 추출.
 * 우선순위:
 *   1. message 내부에 prefix가 있으면 파싱 결과 사용
 *   2. INSIGHT_MESSAGES 매핑 테이블 lookup
 *   3. backward compat: 매핑 없으면 null (InsightCard가 기존 방식으로 렌더링)
 */
export function getStructuredInsight(insight) {
  if (!insight) return null;

  const parsed = parseStructuredMessage(insight.message);
  if (parsed) return parsed;

  const mapped = INSIGHT_MESSAGES[insight.id];
  if (mapped) {
    // action_hint(core.action) 우선 — 매핑의 action보다 데이터값을 포함할 수 있어 더 정확
    return {
      lead: insight.message,
      cause:  mapped.cause,
      impact: mapped.impact,
      action: insight.action || mapped.action,
    };
  }

  return null;
}
