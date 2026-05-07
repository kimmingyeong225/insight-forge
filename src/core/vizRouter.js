/**
 * 시각화 라우터 (viz-rules.md의 차트 매핑 규칙을 코드로 구현)
 * 
 * 데이터 형태(shape)와 의미(semantic)에 따라 적합한 위젯 컴포넌트 타입을 선택한다.
 * 실제 컴포넌트는 components/* 에서 import하여 매핑한다.
 */

/**
 * 데이터 형태로 차트 타입 결정
 * @returns {string} 컴포넌트 이름
 */
export function selectChart({ shape, categoryCount = 0, isMatrix = false, isTimeSeries = false }) {
  if (shape === 'scalar_kpi') return 'KpiCard';
  if (shape === 'gauge_score') return 'Gauge';
  if (isTimeSeries) return 'LineChart';
  if (isMatrix) return 'Heatmap';
  if (shape === 'proportion') {
    return categoryCount <= 10 ? 'DonutChart' : 'HorizontalBarChart';
  }
  if (shape === 'categorical_compare') return 'BarChart';
  if (shape === 'insight_message') return 'InsightCard';
  return 'KpiCard'; // fallback
}

/**
 * 0~100 점수를 등급 색상에 매핑 (viz-rules.md의 등급 색상 그대로)
 */
export function gradeColor(score) {
  if (score >= 80) return { name: 'excellent', color: '#43A047', bg: '#EAF3DE', label: '매우 우수' };
  if (score >= 60) return { name: 'good',      color: '#7CB342', bg: '#EAF3DE', label: '양호' };
  if (score >= 40) return { name: 'moderate',  color: '#BA7517', bg: '#FAEEDA', label: '보통' };
  if (score >= 20) return { name: 'warning',   color: '#FB8C00', bg: '#FAEEDA', label: '주의' };
  return                  { name: 'critical',  color: '#993C1D', bg: '#FAECE7', label: '위험' };
}

/**
 * 지표별 등급 평가 (각 지표의 해석 기준 반영)
 */
export function evaluateGrade(metricId, value) {
  switch (metricId) {
    case 'volatility':
      if (value < 0.15) return { color: '#3B6D11', bg: '#EAF3DE', label: '낮음' };
      if (value < 0.25) return { color: '#185FA5', bg: '#E6F1FB', label: '보통' };
      if (value < 0.40) return { color: '#BA7517', bg: '#FAEEDA', label: '높음' };
      return                   { color: '#993C1D', bg: '#FAECE7', label: '매우 높음' };

    case 'sharpe_ratio':
    case 'rar':
      if (value >= 2.0) return { color: '#3B6D11', bg: '#EAF3DE', label: '탁월' };
      if (value >= 1.5) return { color: '#3B6D11', bg: '#EAF3DE', label: '우수' };
      if (value >= 1.0) return { color: '#185FA5', bg: '#E6F1FB', label: '양호' };
      return                   { color: '#BA7517', bg: '#FAEEDA', label: '부족' };

    case 'mdd': {
      const v = Math.abs(value);
      if (v < 0.10) return { color: '#3B6D11', bg: '#EAF3DE', label: '안정' };
      if (v < 0.20) return { color: '#185FA5', bg: '#E6F1FB', label: '보통' };
      if (v < 0.30) return { color: '#BA7517', bg: '#FAEEDA', label: '주의' };
      return               { color: '#993C1D', bg: '#FAECE7', label: '위험' };
    }

    case 'cumulative_return':
      if (value > 0) return { color: '#3B6D11', bg: '#EAF3DE', label: `+${(value * 100).toFixed(1)}%` };
      return                { color: '#993C1D', bg: '#FAECE7', label: `${(value * 100).toFixed(1)}%` };

    case 'diversification_score':
    case 'health_score':
    case 'volatility_adjusted_risk_score': {
      const g = gradeColor(value);
      return { color: g.color, bg: g.bg, label: g.label };
    }

    case 'concentration_score':
      if (value < 1500) return { color: '#3B6D11', bg: '#EAF3DE', label: '분산' };
      if (value < 2500) return { color: '#BA7517', bg: '#FAEEDA', label: '보통' };
      return                   { color: '#993C1D', bg: '#FAECE7', label: '고도 집중' };

    case 'momentum_strength':
      if (value > 5)  return { color: '#3B6D11', bg: '#EAF3DE', label: '강한 상승' };
      if (value > 0)  return { color: '#185FA5', bg: '#E6F1FB', label: '약한 상승' };
      if (value > -5) return { color: '#BA7517', bg: '#FAEEDA', label: '약한 하락' };
      return                 { color: '#993C1D', bg: '#FAECE7', label: '강한 하락' };

    case 'btc_dominance':
      if (value > 0.4) return { color: '#3B6D11', bg: '#EAF3DE', label: '안정형' };
      return                  { color: '#BA7517', bg: '#FAEEDA', label: '알트 중심' };

    case 'nvt_ratio':
      if (value < 50)  return { color: '#3B6D11', bg: '#EAF3DE', label: '저평가' };
      if (value < 150) return { color: '#185FA5', bg: '#E6F1FB', label: '적정' };
      return                  { color: '#993C1D', bg: '#FAECE7', label: '과대평가' };

    case 'active_address_momentum':
      if (value > 20) return { color: '#3B6D11', bg: '#EAF3DE', label: '강한 성장' };
      if (value > 0)  return { color: '#185FA5', bg: '#E6F1FB', label: '안정' };
      return                 { color: '#993C1D', bg: '#FAECE7', label: '둔화' };

    case 'fundamental_divergence':
      if (value > 0.5)  return { color: '#993C1D', bg: '#FAECE7', label: '과열' };
      if (value > -0.5) return { color: '#185FA5', bg: '#E6F1FB', label: '균형' };
      return                   { color: '#3B6D11', bg: '#EAF3DE', label: '저평가' };

    default:
      return { color: '#888', bg: '#F0F0F0', label: '' };
  }
}

/**
 * 코인별 고정 색상 (crypto 번들의 viz-rules.md)
 */
const COIN_COLORS = {
  BTC:  '#F7931A',
  ETH:  '#627EEA',
  USDT: '#26A17B',
  USDC: '#2775CA',
  BNB:  '#F0B90B',
  SOL:  '#9945FF',
  XRP:  '#23292F',
  ADA:  '#0033AD',
  DOGE: '#C3A634',
  AVAX: '#E84142',
};

const STOCK_COLORS = ['#0F1B3D', '#BA7517', '#3B6D11', '#185FA5', '#993C1D', '#534AB7', '#7CB342', '#9945FF'];

export function getColorForSymbol(symbol, index = 0, isCrypto = false) {
  if (isCrypto && COIN_COLORS[symbol]) return COIN_COLORS[symbol];
  return STOCK_COLORS[index % STOCK_COLORS.length];
}
