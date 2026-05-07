/**
 * 시나리오 정의 (report-rules.md 3장)
 * 각 시나리오는 KPI 선택, 섹션 강조/숨김, 인사이트 필터를 결정한다.
 */

export const SCENARIOS = {
  'insight-forge-default': [
    {
      id: 'personal_default',
      label: '개인 투자자',
      description: '균형 잡힌 종합 진단',
      kpis: ['cumulative_return', 'volatility', 'sharpe_ratio', 'mdd',
             'diversification_score', 'concentration_score', 'rar', 'momentum_strength'],
      hideSections: [],
    },
    {
      id: 'risk_focused',
      label: '리스크 중심',
      description: '위험 지표 강조 — 자산운용·리스크관리팀',
      kpis: ['volatility', 'mdd', 'concentration_score', 'diversification_score',
             'sharpe_ratio', 'momentum_strength'],
      hideSections: ['trend_collapsed'],
      insightFilter: ['위험', '분산'],
    },
    {
      id: 'performance_focused',
      label: '성과 중심',
      description: '운용 성과 평가 — 알파·정보비율 강조',
      kpis: ['cumulative_return', 'sharpe_ratio', 'rar', 'momentum_strength',
             'volatility', 'mdd'],
      hideSections: ['composition_collapsed'],
      insightFilter: ['수익', '추세'],
    },
    {
      id: 'compliance_review',
      label: '컴플라이언스',
      description: '집중도·단일종목 비중 검토',
      kpis: ['concentration_score', 'diversification_score', 'volatility',
             'mdd', 'sharpe_ratio'],
      hideSections: ['trend_hidden'],
      insightFilter: ['분산', '위험'],
    },
    {
      id: 'executive_brief',
      label: '임원 브리핑',
      description: '1분 안에 핵심만 — 종합 진단만 표시',
      kpis: ['cumulative_return', 'volatility', 'sharpe_ratio', 'mdd'],
      executiveBrief: true, // 차트·히트맵 숨김
    },
  ],
  'insight-forge-crypto': [
    {
      id: 'crypto_default',
      label: '일반 암호화폐 투자자',
      description: '메이저+알트 균형 진단',
      kpis: ['cumulative_return', 'volatility', 'mdd', 'btc_dominance',
             'nvt_ratio', 'active_address_momentum', 'volatility_adjusted_risk_score',
             'fundamental_divergence'],
      hideSections: [],
    },
    {
      id: 'defi_focused',
      label: 'DeFi 중심',
      description: '온체인 지표·TVL 강조',
      kpis: ['nvt_ratio', 'active_address_momentum', 'fundamental_divergence',
             'volatility_adjusted_risk_score', 'cumulative_return', 'mdd'],
      hideSections: [],
      insightFilter: ['펀더멘털', '온체인'],
    },
    {
      id: 'stablecoin_strategy',
      label: '스테이블 전략',
      description: '변동성 낮은 운용',
      kpis: ['volatility', 'mdd', 'btc_dominance', 'volatility_adjusted_risk_score',
             'cumulative_return', 'sharpe_ratio'],
      insightFilter: ['위험', '분산'],
    },
    {
      id: 'trader_realtime',
      label: '단기 트레이더',
      description: '실시간 KPI · 캔들 자동',
      kpis: ['cumulative_return', 'volatility', 'momentum_strength',
             'fundamental_divergence', 'active_address_momentum', 'mdd'],
    },
  ],
};

export function getScenarios(bundleId) {
  return SCENARIOS[bundleId] || SCENARIOS['insight-forge-default'];
}

export function getScenario(bundleId, scenarioId) {
  return getScenarios(bundleId).find(s => s.id === scenarioId) || getScenarios(bundleId)[0];
}
