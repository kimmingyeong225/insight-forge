/**
 * KPI 정의 (각 지표의 라벨, 단위, 포맷, 자체 정의 여부)
 * viz-rules.md의 차트 매핑에 직접 연결됨
 */

// Phase 4 hotfix: 503/undefined 응답 시 toFixed throw로 React unmount 되는 회귀 차단.
// 5개 함수 모두 입구에서 nullish/NaN 가드. 폴백은 프로젝트 컨벤션 '—' (U+2014).
const fmt = {
  pct: (v) => (v == null || Number.isNaN(v)) ? '—' : (v * 100).toFixed(1) + '%',
  num: (v) => (v == null || Number.isNaN(v)) ? '—' : v.toFixed(2),
  int: (v) => (v == null || Number.isNaN(v)) ? '—' : Math.round(v).toString(),
  pt:  (v) => (v == null || Number.isNaN(v)) ? '—' : (v >= 0 ? '+' : '') + v.toFixed(1) + 'pt',
  pctSimple: (v) => (v == null || Number.isNaN(v)) ? '—' : v.toFixed(1) + '%',
};

export const KPI_DEFINITIONS = {
  'insight-forge-default': [
    { id: 'cumulative_return', label: '누적 수익률', format: fmt.pct, isCustom: false },
    { id: 'volatility', label: '변동성', format: fmt.pct, isCustom: false },
    { id: 'sharpe_ratio', label: '샤프지수', format: fmt.num, isCustom: false },
    { id: 'mdd', label: '최대낙폭', format: fmt.pct, isCustom: false },
    { id: 'diversification_score', label: '분산투자 점수', format: fmt.int, isCustom: true },
    { id: 'concentration_score', label: '집중도 (HHI)', format: fmt.int, isCustom: true },
    { id: 'rar', label: '위험조정수익률', format: fmt.num, isCustom: true },
    { id: 'momentum_strength', label: '모멘텀 강도', format: fmt.pt, isCustom: true },
  ],
  'insight-forge-crypto': [
    { id: 'cumulative_return', label: '누적 수익률', format: fmt.pct, isCustom: false },
    { id: 'volatility', label: '변동성', format: fmt.pct, isCustom: false },
    { id: 'mdd', label: '최대낙폭', format: fmt.pct, isCustom: false },
    { id: 'btc_dominance', label: 'BTC 도미넌스', format: fmt.pct, isCustom: false },
    { id: 'nvt_ratio', label: 'NVT 비율', format: fmt.int, isCustom: true },
    { id: 'active_address_momentum', label: '활성주소 모멘텀', format: fmt.pctSimple, isCustom: true },
    { id: 'volatility_adjusted_risk_score', label: '변동성조정 위험', format: fmt.int, isCustom: true },
    { id: 'fundamental_divergence', label: '펀더멘털 괴리도', format: fmt.num, isCustom: true },
  ],
};

export function getKpiDefinitions(bundleId) {
  return KPI_DEFINITIONS[bundleId] || KPI_DEFINITIONS['insight-forge-default'];
}
