/**
 * 데이터 정규화 모듈 (data-rules.md의 규칙을 코드로 구현)
 * 
 * - 컬럼 매핑 (한글 → 영문 표준)
 * - 결측치 처리 (forward fill / zero fill)
 * - 포트폴리오 비중 검증 + 강제 정규화 (Skills.md 보강 규칙)
 */

const COLUMN_MAPPING = {
  date:   ['date', '날짜', '일자', '기준일', 'trade_date'],
  symbol: ['symbol', 'ticker', '종목코드', '종목명', 'code'],
  close:  ['close', '종가', 'closing_price', '끝값', '현재가'],
  open:   ['open', '시가', 'opening_price'],
  high:   ['high', '고가', '최고가'],
  low:    ['low', '저가', '최저가'],
  volume: ['volume', '거래량', 'vol', 'trade_volume'],
};

/**
 * raw 데이터의 컬럼명을 표준 필드로 매핑
 */
export function mapColumns(rawRow) {
  const mapped = {};
  Object.entries(rawRow).forEach(([key, value]) => {
    const standardField = findStandardField(key);
    if (standardField) {
      mapped[standardField] = value;
    } else {
      mapped[key] = value; // 매핑 없으면 원본 보존
    }
  });
  return mapped;
}

function findStandardField(rawKey) {
  const normalized = rawKey.toLowerCase().trim();
  for (const [standard, candidates] of Object.entries(COLUMN_MAPPING)) {
    if (candidates.some(c => c.toLowerCase() === normalized)) {
      return standard;
    }
  }
  return null;
}

/**
 * 시계열 데이터 정규화: 컬럼 매핑 + 결측치 처리
 */
export function normalizeTimeSeries(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  const mapped = rawData.map(mapColumns);
  let lastClose = null;

  return mapped.map(row => {
    const out = { ...row };
    // close 결측 → forward fill
    if (out.close == null || out.close === '') {
      if (lastClose != null) out.close = lastClose;
    } else {
      lastClose = parseFloat(out.close);
      out.close = lastClose;
    }
    // volume 결측 → 0
    if (out.volume == null || out.volume === '') {
      out.volume = 0;
    } else {
      out.volume = parseInt(out.volume, 10) || 0;
    }
    return out;
  }).filter(row => row.date && row.symbol); // date·symbol 결측 행 제거
}

/**
 * 포트폴리오 비중 정규화
 * 
 * Skills.md 보강 규칙:
 * weight 합계가 1.0 ± 0.01 범위를 벗어나면
 * 경고 메시지 + 강제 정규화하여 렌더링한다.
 * 정규화: weight[i] = weight[i] / Σ(weight)
 * 
 * @returns {object} { holdings, warning, originalSum, wasNormalized }
 */
export function normalizePortfolio(rawHoldings) {
  if (!Array.isArray(rawHoldings) || rawHoldings.length === 0) {
    return { holdings: [], warning: null, originalSum: 0, wasNormalized: false };
  }

  const holdings = rawHoldings.map(h => ({
    symbol: h.symbol,
    weight: parseFloat(h.weight) || 0,
    quantity: h.quantity,
    avg_price: h.avg_price,
    _originalWeight: parseFloat(h.weight) || 0,
  }));

  const sum = holdings.reduce((acc, h) => acc + h.weight, 0);

  if (Math.abs(sum - 1.0) > 0.01) {
    // 강제 정규화 — UI 렌더링이 깨지지 않도록
    const normalized = holdings.map(h => ({
      ...h,
      weight: h.weight / sum,
    }));
    return {
      holdings: normalized,
      warning: `포트폴리오 비중 합계가 ${(sum * 100).toFixed(1)}%로 100%에서 벗어나 자동 정규화됐습니다.`,
      originalSum: sum,
      wasNormalized: true,
    };
  }

  return { holdings, warning: null, originalSum: sum, wasNormalized: false };
}
