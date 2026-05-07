/**
 * 인사이트 생성 엔진 (insight-rules.md의 22개 트리거 조건 평가)
 * 
 * 각 인사이트는 category 필드를 갖고, 시나리오의 insightFilter 적용 가능
 */

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, success: 3 };

function evaluateDefaultBundle(metrics, holdings) {
  const insights = [];
  const maxWeight = Math.max(...holdings.map(h => h.weight));

  // === 종합 ===
  if (metrics.health_score >= 80) {
    insights.push({
      id: 'excellent_health', severity: 'success', priority: 70, category: '종합',
      message: `포트폴리오 건강도 ${metrics.health_score}점 — 매우 건강한 상태입니다.`,
      rule: 'health_score >= 80',
    });
  } else if (metrics.health_score < 40) {
    insights.push({
      id: 'critical_health', severity: 'critical', priority: 1, category: '종합',
      message: `포트폴리오 건강도가 ${metrics.health_score}점으로 위험 수준입니다.`,
      action: '각 세부 지표의 인사이트 카드를 우선 확인하세요.',
      rule: 'health_score < 40',
    });
  }

  // === 위험 — 변동성 ===
  if (metrics.volatility > 0.40) {
    insights.push({
      id: 'extreme_volatility', severity: 'critical', priority: 5, category: '위험',
      message: `연환산 변동성이 ${(metrics.volatility * 100).toFixed(1)}%로 매우 높습니다.`,
      action: '방어주·채권 ETF·현금성 자산 비중 확대를 고려하세요.',
      rule: 'volatility > 0.40',
    });
  } else if (metrics.volatility > 0.25) {
    insights.push({
      id: 'high_volatility', severity: 'warning', priority: 20, category: '위험',
      message: `변동성이 ${(metrics.volatility * 100).toFixed(1)}%로 높은 수준입니다.`,
      action: '변동성이 큰 종목의 비중을 줄이거나 안정적인 자산을 추가해보세요.',
      rule: 'volatility > 0.25',
    });
  } else if (metrics.volatility < 0.15) {
    insights.push({
      id: 'stable_volatility', severity: 'success', priority: 60, category: '위험',
      message: `연환산 변동성이 ${(metrics.volatility * 100).toFixed(1)}%로 안정적입니다.`,
      rule: 'volatility < 0.15',
    });
  }

  // === 위험 — MDD ===
  if (metrics.mdd < -0.25) {
    insights.push({
      id: 'significant_drawdown', severity: 'critical', priority: 3, category: '위험',
      message: `최대낙폭이 ${(metrics.mdd * 100).toFixed(1)}%로 -25%를 초과했습니다. 1년 이상의 회복 기간을 요할 수 있는 수준입니다.`,
      action: '손실 회피보다 장기 회복 전략 수립이 중요합니다. 평단가 분석을 권장합니다.',
      rule: 'mdd < -0.25',
    });
  }

  // === 분산 ===
  if (maxWeight > 0.50) {
    insights.push({
      id: 'single_stock_overweight', severity: 'critical', priority: 8, category: '분산',
      message: `단일 종목이 포트폴리오의 ${(maxWeight * 100).toFixed(0)}%를 차지하고 있습니다.`,
      action: '비중을 30~40% 수준으로 낮추는 분할 매도를 검토하세요.',
      rule: 'max_weight > 0.50',
    });
  }

  if (metrics.diversification_score < 40) {
    insights.push({
      id: 'low_diversification', severity: 'warning', priority: 22, category: '분산',
      message: `분산투자 점수가 ${metrics.diversification_score}점으로 낮습니다.`,
      action: '다른 섹터·자산군의 종목을 추가하면 분산 효과가 개선됩니다.',
      rule: 'diversification_score < 40',
    });
  } else if (metrics.diversification_score >= 70) {
    insights.push({
      id: 'good_diversification', severity: 'success', priority: 65, category: '분산',
      message: `분산투자 점수 ${metrics.diversification_score}점 — 효율적인 분산이 이루어지고 있습니다.`,
      rule: 'diversification_score >= 70',
    });
  }

  if (metrics.concentration_score > 2500) {
    insights.push({
      id: 'high_concentration', severity: 'warning', priority: 18, category: '분산',
      message: `포트폴리오 집중도(HHI)가 ${metrics.concentration_score}로 고도 집중 구간입니다.`,
      action: '최대 비중 종목의 비중을 30% 이하로 조정하는 것을 권장합니다.',
      rule: 'concentration_score > 2500',
    });
  }

  // === 수익 ===
  if (metrics.alpha !== undefined && metrics.alpha > 0.03) {
    insights.push({
      id: 'alpha_positive', severity: 'success', priority: 55, category: '수익',
      message: `벤치마크 대비 연 +${(metrics.alpha * 100).toFixed(1)}%의 초과 성과를 기록 중입니다.`,
      rule: 'alpha > 0.03',
    });
  } else if (metrics.alpha !== undefined && metrics.alpha < -0.03) {
    insights.push({
      id: 'alpha_negative', severity: 'info', priority: 40, category: '수익',
      message: `벤치마크 대비 연 ${(metrics.alpha * 100).toFixed(1)}% 부진합니다. 종목 선정·비중 조정 효과를 재검토하세요.`,
      rule: 'alpha < -0.03',
    });
  }

  if (metrics.sharpe_ratio > 1.5) {
    insights.push({
      id: 'excellent_sharpe', severity: 'success', priority: 50, category: '수익',
      message: `샤프지수가 ${metrics.sharpe_ratio.toFixed(2)}로 우수합니다. 위험 대비 수익률이 양호합니다.`,
      rule: 'sharpe_ratio > 1.5',
    });
  } else if (metrics.sharpe_ratio < 0.5) {
    insights.push({
      id: 'poor_sharpe', severity: 'warning', priority: 25, category: '수익',
      message: `샤프지수가 ${metrics.sharpe_ratio.toFixed(2)}로 낮습니다. 위험 대비 수익이 부족한 상태입니다.`,
      action: '수익률이 낮거나 변동성이 큰 종목을 점검하세요.',
      rule: 'sharpe_ratio < 0.5',
    });
  }

  if (metrics.rar > 1.0) {
    insights.push({
      id: 'excellent_rar', severity: 'success', priority: 58, category: '수익',
      message: `위험조정수익률(RAR)이 ${metrics.rar.toFixed(2)}로 우수합니다.`,
      rule: 'rar > 1.0',
    });
  } else if (metrics.rar < 0.5) {
    insights.push({
      id: 'poor_rar', severity: 'info', priority: 42, category: '수익',
      message: `위험조정수익률(RAR)이 ${metrics.rar.toFixed(2)}로 낮은 편입니다.`,
      rule: 'rar < 0.5',
    });
  }

  // === 추세 ===
  if (metrics.momentum_strength > 5) {
    insights.push({
      id: 'strong_momentum', severity: 'info', priority: 45, category: '추세',
      message: `최근 1개월 추세가 직전 3개월 평균 대비 +${metrics.momentum_strength.toFixed(1)}pt 강합니다.`,
      action: '단기 과열 가능성도 함께 검토하세요.',
      rule: 'momentum_strength > 5',
    });
  } else if (metrics.momentum_strength < -5) {
    insights.push({
      id: 'momentum_reversal', severity: 'warning', priority: 28, category: '추세',
      message: `최근 1개월 추세 약화 (${metrics.momentum_strength.toFixed(1)}pt). 추세 전환 가능성을 주시하세요.`,
      action: '지지선·이동평균선 이탈 여부를 추가로 확인하세요.',
      rule: 'momentum_strength < -5',
    });
  }

  // === 시스템 ===
  if (metrics.data_quality_score !== undefined && metrics.data_quality_score < 70) {
    insights.push({
      id: 'low_data_quality', severity: 'warning', priority: 15, category: '시스템',
      message: `분석 데이터의 품질 점수가 ${metrics.data_quality_score}점입니다. 결측·이상치가 일부 포함되어 있어 결과 해석에 주의가 필요합니다.`,
      action: '원본 데이터의 결측 구간을 확인하고 필요 시 보완하세요.',
      rule: 'data_quality_score < 70',
    });
  }

  return insights;
}

function evaluateCryptoBundle(metrics, holdings) {
  const insights = [];

  if (metrics.volatility > 2.0) {
    insights.push({
      id: 'extreme_crypto_volatility', severity: 'critical', priority: 3, category: '위험',
      message: `변동성이 연환산 ${(metrics.volatility * 100).toFixed(0)}%로 매우 높습니다.`,
      action: '포트폴리오의 30% 이상을 스테이블코인으로 분산하는 방안을 검토하세요.',
      rule: 'volatility > 2.0',
    });
  } else if (metrics.volatility > 1.0) {
    insights.push({
      id: 'high_crypto_volatility', severity: 'warning', priority: 12, category: '위험',
      message: `변동성이 ${(metrics.volatility * 100).toFixed(0)}%로 높은 수준입니다.`,
      rule: 'volatility > 1.0',
    });
  }

  if (metrics.mdd < -0.5) {
    insights.push({
      id: 'large_crypto_drawdown', severity: 'warning', priority: 12, category: '위험',
      message: `최대낙폭 ${(metrics.mdd * 100).toFixed(0)}%. 암호화폐 평균 회복 기간은 1~2년이 소요될 수 있습니다.`,
      action: '추가 매수 시점 분할 검토 또는 손절 기준 재정립을 권장합니다.',
      rule: 'mdd < -0.5',
    });
  }

  if (metrics.nvt_ratio > 150) {
    insights.push({
      id: 'high_nvt_warning', severity: 'warning', priority: 20, category: '펀더멘털',
      message: `NVT 비율이 ${metrics.nvt_ratio}로 높은 수준입니다. 가격 과대평가 가능성.`,
      rule: 'nvt_ratio > 150',
    });
  } else if (metrics.nvt_ratio < 50) {
    insights.push({
      id: 'low_nvt_signal', severity: 'info', priority: 45, category: '펀더멘털',
      message: `NVT 비율 ${metrics.nvt_ratio} — 활발한 거래로 저평가 가능성.`,
      rule: 'nvt_ratio < 50',
    });
  }

  if (metrics.active_address_momentum > 20) {
    insights.push({
      id: 'network_growth_strong', severity: 'success', priority: 55, category: '펀더멘털',
      message: `활성 주소 수가 직전 90일 대비 +${metrics.active_address_momentum.toFixed(1)}% 증가. 네트워크 성장 중.`,
      rule: 'active_address_momentum > 20',
    });
  } else if (metrics.active_address_momentum < -20) {
    insights.push({
      id: 'network_decline', severity: 'warning', priority: 18, category: '펀더멘털',
      message: `활성 주소 수가 ${metrics.active_address_momentum.toFixed(1)}% 감소. 네트워크 둔화 주의.`,
      action: '온체인 데이터를 추가로 확인하여 일시적 현상인지 추세인지 판단하세요.',
      rule: 'active_address_momentum < -20',
    });
  }

  if (metrics.fundamental_divergence > 0.5) {
    insights.push({
      id: 'fundamental_divergence', severity: 'warning', priority: 22, category: '펀더멘털',
      message: '가격 상승이 네트워크 활동 증가를 크게 앞섰습니다. 가격 과열 가능성.',
      action: '온체인 데이터를 추가 확인하여 추세를 판단하세요.',
      rule: 'fundamental_divergence > 0.5',
    });
  }

  if (metrics.stablecoin_ratio === 0 && holdings.length > 1) {
    insights.push({
      id: 'no_stablecoin', severity: 'info', priority: 38, category: '분산',
      message: '스테이블코인 비중이 0입니다. 시장 하락 시 헤지 수단 부재.',
      action: '10~30%의 스테이블코인 비중 유지를 검토하세요.',
      rule: 'stablecoin_ratio == 0',
    });
  }

  if (metrics.btc_dominance < 0.20 && holdings.length > 1) {
    insights.push({
      id: 'low_btc_dominance', severity: 'info', priority: 40, category: '분산',
      message: `BTC 비중이 ${(metrics.btc_dominance * 100).toFixed(0)}%로 낮습니다. 알트코인 중심 구성으로 변동성이 더 클 수 있습니다.`,
      rule: 'btc_dominance < 0.2',
    });
  }

  if (metrics.mean_correlation > 0.85) {
    insights.push({
      id: 'high_crypto_correlation', severity: 'warning', priority: 25, category: '분산',
      message: `보유 코인 간 평균 상관계수 ${metrics.mean_correlation.toFixed(2)}. 분산 효과 제한적.`,
      rule: 'mean_correlation > 0.85',
    });
  }

  if (metrics.volatility_adjusted_risk_score >= 70) {
    insights.push({
      id: 'safe_crypto', severity: 'success', priority: 60, category: '위험',
      message: `변동성 조정 위험 점수 ${metrics.volatility_adjusted_risk_score}점 — 상대적으로 안정적.`,
      rule: 'risk_score >= 70',
    });
  }

  return insights;
}

/**
 * 메인 — 시나리오 필터 적용 가능
 */
export function evaluateInsights(metrics, holdings, bundleId, scenarioFilter = null) {
  let insights;
  if (bundleId === 'insight-forge-crypto') {
    insights = evaluateCryptoBundle(metrics, holdings);
  } else {
    insights = evaluateDefaultBundle(metrics, holdings);
  }

  // 시나리오 카테고리 필터 적용 (report-rules.md insightFilter)
  if (scenarioFilter && Array.isArray(scenarioFilter) && scenarioFilter.length > 0) {
    insights = insights.filter(ins => scenarioFilter.includes(ins.category));
  }

  insights.sort((a, b) => {
    const sd = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sd !== 0) return sd;
    return a.priority - b.priority;
  });

  return insights;
}
