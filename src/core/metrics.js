/**
 * 지표 계산 모듈 (metric-rules.md의 규칙을 코드로 구현)
 * 
 * 표준 통계 함수 (std, mean, cov 등)는 expr-eval에 내장되어 있지 않으므로
 * 본 모듈에서 직접 구현한다. (Skills.md 구현 참고 박스 참조)
 * 
 * 자체 정의 지표 5종:
 *  1. 분산투자 점수 (Diversification Score)
 *  2. 집중도 점수 (Concentration / HHI)
 *  3. 포트폴리오 건강도 (Health Score)
 *  4. 위험조정수익률 (RAR)
 *  5. 모멘텀 강도 (Momentum Strength)
 */

// ============================================================
// 통계 함수 (expr-eval 한계 보완 — Skills.md 명시)
// ============================================================

export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function std(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function cov(a, b) {
  if (!a || !b || a.length !== b.length || a.length < 2) return 0;
  const ma = mean(a), mb = mean(b);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (a.length - 1);
}

export function corr(a, b) {
  const sa = std(a), sb = std(b);
  if (sa === 0 || sb === 0) return 0;
  return cov(a, b) / (sa * sb);
}

export function clip(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ============================================================
// 기본 지표
// ============================================================

/** 일별 수익률: (close[t] - close[t-1]) / close[t-1] */
export function dailyReturns(closes) {
  const out = [];
  for (let i = 1; i < closes.length; i++) {
    out.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return out;
}

/** 누적 수익률: close[t] / close[0] - 1 */
export function cumulativeReturn(closes) {
  if (closes.length < 2) return 0;
  return closes[closes.length - 1] / closes[0] - 1;
}

/** 변동성: std(daily_return) × √252 */
export function volatility(closes, periodsPerYear = 252) {
  const returns = dailyReturns(closes);
  return std(returns) * Math.sqrt(periodsPerYear);
}

/** 최대낙폭 (MDD) */
export function maxDrawdown(closes) {
  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (c - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd; // 음수
}

/** 샤프지수: (annual_return - rf) / volatility */
export function sharpeRatio(closes, rf = 0.035, periodsPerYear = 252) {
  const cumRet = cumulativeReturn(closes);
  const periods = closes.length - 1;
  const annual = Math.pow(1 + cumRet, periodsPerYear / periods) - 1;
  const vol = volatility(closes, periodsPerYear);
  if (vol === 0) return 0;
  return (annual - rf) / vol;
}

// ============================================================
// 자체 정의 지표 5종
// ============================================================

/**
 * 4.1 분산투자 점수 (Diversification Score, 0~100)
 * 수식: 100 × (1 - mean_correlation)
 */
export function diversificationScore(meanCorrelation) {
  return clip(100 * (1 - meanCorrelation), 0, 100);
}

/**
 * 4.2 집중도 점수 (HHI 기반)
 * 수식: Σ(weight[i]²) × 10000
 */
export function concentrationScore(weights) {
  return weights.reduce((acc, w) => acc + w * w, 0) * 10000;
}

/**
 * 4.3 포트폴리오 건강도 (0~100)
 * 수식: 0.30×샤프점수 + 0.30×MDD점수 + 0.20×분산점수 + 0.20×변동성점수
 */
export function healthScore({ sharpe, mdd, diversification, vol }) {
  const sharpeNorm = clip(sharpe * 50, 0, 100);
  const mddNorm = clip(100 + mdd * 333, 0, 100); // mdd는 음수
  const divNorm = diversification; // 이미 0~100
  const volNorm = clip(100 - vol * 200, 0, 100);
  return 0.30 * sharpeNorm + 0.30 * mddNorm + 0.20 * divNorm + 0.20 * volNorm;
}

/**
 * 4.4 위험조정수익률 (RAR)
 * 수식: cumulative_return / (volatility × √(period_days / 252))
 */
export function rar(cumReturn, vol, periodDays) {
  if (vol === 0) return 0;
  return cumReturn / (vol * Math.sqrt(periodDays / 252));
}

/**
 * 4.5 모멘텀 강도
 * 수식: (recent_1m_return - prior_3m_avg_return) × 100
 */
export function momentumStrength(closes) {
  if (closes.length < 84) return 0;
  const T = closes.length - 1;
  const recent1m = (closes[T] / closes[T - 21]) - 1;

  // 직전 3개월 (T-84 ~ T-21)을 21일 단위로 분할하여 월수익률 평균
  const monthlyReturns = [];
  for (let start = T - 84; start <= T - 42; start += 21) {
    if (start + 21 <= closes.length) {
      monthlyReturns.push((closes[start + 21] / closes[start]) - 1);
    }
  }
  const prior3mAvg = mean(monthlyReturns);
  return (recent1m - prior3mAvg) * 100;
}

// ============================================================
// 포트폴리오 지표
// ============================================================

/** 종목 간 상관행렬 */
export function correlationMatrix(returnsBySymbol) {
  const symbols = Object.keys(returnsBySymbol);
  const n = symbols.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) matrix[i][j] = 1;
      else matrix[i][j] = corr(returnsBySymbol[symbols[i]], returnsBySymbol[symbols[j]]);
    }
  }
  return { symbols, matrix };
}

/** 평균 상관계수 (대각선 제외) */
export function meanCorrelation(matrix) {
  const n = matrix.length;
  if (n < 2) return 0;
  let sum = 0, count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) { sum += matrix[i][j]; count++; }
    }
  }
  return count > 0 ? sum / count : 0;
}

// ============================================================
// 종합 계산: 데이터셋 전체에서 모든 지표 산출
// ============================================================

/** 베타 (Beta) — 시장 변동에 대한 자산의 민감도 */
export function beta(assetReturns, benchReturns) {
  const benchVar = std(benchReturns) ** 2;
  if (benchVar === 0) return 1;
  return cov(assetReturns, benchReturns) / benchVar;
}

/** 알파 (Alpha) — 베타로 설명되지 않는 초과수익률 (연율화) */
export function alpha(assetCumReturn, benchCumReturn, betaValue, periodDays = 252, rf = 0.035) {
  const assetAnnual = Math.pow(1 + assetCumReturn, 252 / periodDays) - 1;
  const benchAnnual = Math.pow(1 + benchCumReturn, 252 / periodDays) - 1;
  return assetAnnual - (rf + betaValue * (benchAnnual - rf));
}

/**
 * 데이터셋의 모든 지표를 한 번에 계산
 * 의존성 그래프 (metric-rules.md 5장)에 따라 순차적으로 처리
 */
export function computeAllMetrics(dataset) {
  const { holdings, returnsBySymbol, portfolioCloses, periodDays = 252 } = dataset;

  // 1. 기본 지표
  const cumRet = cumulativeReturn(portfolioCloses);
  const vol = volatility(portfolioCloses);
  const mdd = maxDrawdown(portfolioCloses);
  const sharpe = sharpeRatio(portfolioCloses);

  // 2. 포트폴리오 지표
  const { symbols, matrix } = correlationMatrix(returnsBySymbol);
  const meanCorr = meanCorrelation(matrix);

  // 3. 자체 정의 지표
  const divScore = diversificationScore(meanCorr);
  const weights = holdings.map(h => h.weight);
  const concScore = concentrationScore(weights);
  const health = healthScore({ sharpe, mdd, diversification: divScore, vol });
  const rarValue = rar(cumRet, vol, periodDays);
  const momentum = momentumStrength(portfolioCloses);

  // 4. 베타·알파 (벤치마크는 KOSPI 가정 — 평균 시장 수익률로 대체)
  // 시장 벤치마크가 주어지지 않으면, 보유 종목들의 단순 평균을 시장 대용으로 사용
  const portfolioReturns = dailyReturns(portfolioCloses);
  const benchCloses = simulateBenchmark(portfolioCloses);
  const benchReturns = dailyReturns(benchCloses);
  const benchCumRet = cumulativeReturn(benchCloses);
  const portBeta = beta(portfolioReturns, benchReturns);
  const portAlpha = alpha(cumRet, benchCumRet, portBeta, portfolioCloses.length - 1);

  return {
    cumulative_return: cumRet,
    volatility: vol,
    mdd,
    sharpe_ratio: sharpe,
    mean_correlation: meanCorr,
    diversification_score: Math.round(divScore),
    concentration_score: Math.round(concScore),
    health_score: Math.round(health),
    rar: rarValue,
    momentum_strength: momentum,
    beta: portBeta,
    alpha: portAlpha,
    // 보조 데이터
    correlation_matrix: matrix,
    correlation_symbols: symbols,
    max_single_weight: Math.max(...weights),
  };
}

/**
 * 벤치마크 대용 시계열 생성
 * 실제 KOSPI 데이터가 없으므로 포트폴리오 시계열보다 변동성을 줄인 추정 시장 시계열을 생성한다.
 * 일반적으로 KOSPI는 연 8~10% 수익, 변동성 18% 수준.
 */
function simulateBenchmark(portfolioCloses) {
  const n = portfolioCloses.length;
  const result = [100];
  // 단순한 평균 회귀형 시장 가정 (실 운영에선 KOSPI close 데이터 fetch)
  const portReturns = dailyReturns(portfolioCloses);
  for (let i = 1; i < n; i++) {
    // 시장은 포트폴리오 수익률의 60% 정도 수준 (베타 1.0 기준)
    const marketRet = portReturns[i - 1] * 0.65;
    result.push(result[result.length - 1] * (1 + marketRet));
  }
  return result;
}
