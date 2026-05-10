/**
 * 더미 데이터셋 생성 + 시계열 모의 (지수 기하 브라운 운동)
 *
 * default 8종 + crypto 6종 = 총 14가지 시나리오 지원
 * + buildUserDataset() — CSV 업로드 데이터 처리
 * + fetchRealSeries() / buildLiveDataset() — Yahoo Finance 실시간 연동
 */

import { getYahooSymbol } from './symbolMap.js';

// ============================================================
// PRNG
// ============================================================

function makePRNG(seedStr) {
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function sfc32(a, b, c, d) {
    return () => {
      a |= 0; b |= 0; c |= 0; d |= 0;
      const t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  const seed = xmur3(seedStr);
  return sfc32(seed(), seed(), seed(), seed());
}

function normal(rng) {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function gbmSeries(targetCumReturn, annualVol, days, seed) {
  const rng = makePRNG(seed);
  const dailyVol = annualVol / Math.sqrt(252);
  const dailyDrift = Math.log(1 + targetCumReturn) / days;
  let value = 100;
  const series = [{ x: 0, y: value }];
  for (let i = 1; i <= days; i++) {
    const z = normal(rng);
    value *= Math.exp(dailyDrift - 0.5 * dailyVol * dailyVol + dailyVol * z);
    series.push({ x: i, y: value });
  }
  return series;
}

// ============================================================
// 종목 프로필 (재사용용)
// ============================================================

const STOCK_PROFILES = {
  '삼성전자':         { ret: 0.184, vol: 0.25, seed: 'samsung' },
  'SK하이닉스':       { ret: 0.412, vol: 0.42, seed: 'skhynix' },
  'NAVER':            { ret: 0.112, vol: 0.28, seed: 'naver' },
  '카카오':           { ret: -0.038, vol: 0.34, seed: 'kakao' },
  'LG에너지솔루션':   { ret: 0.226, vol: 0.32, seed: 'lgenergy' },
  '현대차':           { ret: 0.158, vol: 0.26, seed: 'hyundai' },
  '셀트리온':         { ret: 0.084, vol: 0.38, seed: 'celltrion' },
  '삼성바이오로직스': { ret: 0.118, vol: 0.31, seed: 'samsungbio' },
  'POSCO홀딩스':      { ret: 0.092, vol: 0.30, seed: 'posco' },
  '에코프로비엠':     { ret: 0.345, vol: 0.48, seed: 'ecopro' },
  '카카오게임즈':     { ret: -0.082, vol: 0.45, seed: 'kakaogames' },
  '펄어비스':         { ret: -0.124, vol: 0.52, seed: 'pearlabyss' },
  'KODEX 200':        { ret: 0.089, vol: 0.18, seed: 'kodex200' },
  'KODEX 국고채':     { ret: 0.032, vol: 0.05, seed: 'bond' },
  'KODEX 고배당':     { ret: 0.105, vol: 0.16, seed: 'koddiv' },
  'TIGER 미국S&P500': { ret: 0.121, vol: 0.16, seed: 'tigersp' },
  'TIGER 차이나전기차':{ ret: 0.085, vol: 0.38, seed: 'chinaev' },
  'KODEX 반도체':     { ret: 0.298, vol: 0.36, seed: 'kodexsem' },
  'KODEX 2차전지':    { ret: 0.245, vol: 0.40, seed: 'kodexbat' },
  'KODEX 바이오':     { ret: 0.062, vol: 0.42, seed: 'kodexbio' },
};

const COIN_PROFILES = {
  BTC:  { ret: 0.285, vol: 0.78, seed: 'btc' },
  ETH:  { ret: 0.352, vol: 0.92, seed: 'eth' },
  USDT: { ret: 0.001, vol: 0.005, seed: 'usdt' },
  USDC: { ret: 0.000, vol: 0.005, seed: 'usdc' },
  BNB:  { ret: 0.215, vol: 0.85, seed: 'bnb' },
  SOL:  { ret: 0.652, vol: 1.20, seed: 'sol' },
  AVAX: { ret: 0.421, vol: 1.15, seed: 'avax' },
  DOGE: { ret: 0.184, vol: 1.40, seed: 'doge' },
  SHIB: { ret: 0.058, vol: 1.85, seed: 'shib' },
  UNI:  { ret: 0.182, vol: 1.05, seed: 'uni' },
  AAVE: { ret: 0.245, vol: 1.10, seed: 'aave' },
  LINK: { ret: 0.198, vol: 0.98, seed: 'link' },
};

function buildHoldings(holdings, profiles, suffix) {
  const returnsBySymbol = {};
  const symbolReturns = [];
  holdings.forEach(h => {
    const profile = profiles[h.symbol];
    if (!profile) {
      console.warn(`Profile not found: ${h.symbol}`);
      return;
    }
    returnsBySymbol[h.symbol] = gbmSeries(profile.ret, profile.vol, 252, profile.seed + suffix).map(p => p.y);
    symbolReturns.push({ name: h.symbol, value: profile.ret * 100 });
  });
  return { returnsBySymbol, symbolReturns };
}

// ============================================================
// default 번들 (8개)
// ============================================================

function makeDefaultDatasets() {
  const datasets = {};

  {
    const holdings = [
      { symbol: '삼성전자', weight: 0.30 },
      { symbol: 'NAVER', weight: 0.20 },
      { symbol: '카카오', weight: 0.15 },
      { symbol: 'LG에너지솔루션', weight: 0.20 },
      { symbol: 'KODEX 200', weight: 0.15 },
    ];
    datasets.balanced = {
      name: '균형형 포트폴리오',
      description: '대형주·ETF 5종목 균등 분산',
      holdings, portfolioCloses: gbmSeries(0.142, 0.218, 252, 'd-balanced'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-balanced'),
    };
  }

  {
    const holdings = [
      { symbol: 'KODEX 200', weight: 0.40 },
      { symbol: 'KODEX 국고채', weight: 0.30 },
      { symbol: '삼성전자', weight: 0.15 },
      { symbol: 'TIGER 미국S&P500', weight: 0.15 },
    ];
    datasets.conservative = {
      name: '보수형 포트폴리오',
      description: 'ETF·국고채 중심 안정 운용',
      holdings, portfolioCloses: gbmSeries(0.087, 0.124, 252, 'd-cons'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-cons'),
    };
  }

  {
    const holdings = [
      { symbol: '카카오', weight: 0.42 },
      { symbol: 'LG에너지솔루션', weight: 0.28 },
      { symbol: 'NAVER', weight: 0.18 },
      { symbol: '삼성전자', weight: 0.12 },
    ];
    datasets.aggressive = {
      name: '공격형 포트폴리오',
      description: '성장주 집중 — 높은 변동성',
      holdings, portfolioCloses: gbmSeries(0.198, 0.342, 252, 'd-aggr'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-aggr'),
    };
  }

  {
    const holdings = [
      { symbol: 'KODEX 고배당', weight: 0.45 },
      { symbol: 'KODEX 200', weight: 0.20 },
      { symbol: '삼성전자', weight: 0.15 },
      { symbol: 'POSCO홀딩스', weight: 0.10 },
      { symbol: 'TIGER 미국S&P500', weight: 0.10 },
    ];
    datasets.dividend = {
      name: '고배당 ETF 중심',
      description: '배당 수익형 — 안정 + 인컴 추구',
      holdings, portfolioCloses: gbmSeries(0.103, 0.16, 252, 'd-div'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-div'),
    };
  }

  {
    const holdings = [
      { symbol: '삼성전자', weight: 0.40 },
      { symbol: 'SK하이닉스', weight: 0.35 },
      { symbol: 'KODEX 반도체', weight: 0.25 },
    ];
    datasets.semiconductor = {
      name: '반도체 테마 집중',
      description: '반도체 섹터 100% — 고집중 위험',
      holdings, portfolioCloses: gbmSeries(0.305, 0.32, 252, 'd-sem'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-sem'),
    };
  }

  {
    const holdings = [
      { symbol: 'LG에너지솔루션', weight: 0.35 },
      { symbol: '에코프로비엠', weight: 0.30 },
      { symbol: 'POSCO홀딩스', weight: 0.20 },
      { symbol: 'KODEX 2차전지', weight: 0.15 },
    ];
    datasets.battery = {
      name: '2차전지 테마 집중',
      description: '2차전지 밸류체인 집중 운용',
      holdings, portfolioCloses: gbmSeries(0.262, 0.38, 252, 'd-bat'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-bat'),
    };
  }

  {
    const holdings = [
      { symbol: 'TIGER 미국S&P500', weight: 0.30 },
      { symbol: 'KODEX 200', weight: 0.20 },
      { symbol: 'TIGER 차이나전기차', weight: 0.15 },
      { symbol: 'KODEX 국고채', weight: 0.20 },
      { symbol: 'KODEX 고배당', weight: 0.15 },
    ];
    datasets.global = {
      name: '글로벌 분산 ETF',
      description: '국내외·자산군 다층 분산',
      holdings, portfolioCloses: gbmSeries(0.094, 0.15, 252, 'd-glob'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-glob'),
    };
  }

  {
    const holdings = [
      { symbol: '삼성전자', weight: 0.65 },
      { symbol: 'KODEX 200', weight: 0.20 },
      { symbol: 'NAVER', weight: 0.10 },
      { symbol: '현대차', weight: 0.05 },
    ];
    datasets.concentrated = {
      name: '단일종목 65% 집중',
      description: '컴플라이언스 검토 사례 — 단일종목 과대',
      holdings, portfolioCloses: gbmSeries(0.165, 0.22, 252, 'd-conc'),
      ...buildHoldings(holdings, STOCK_PROFILES, '-conc'),
    };
  }

  return datasets;
}

// ============================================================
// crypto 번들 (6개)
// ============================================================

function makeCryptoDatasets() {
  const datasets = {};

  {
    const holdings = [
      { symbol: 'BTC', weight: 0.50 },
      { symbol: 'ETH', weight: 0.30 },
      { symbol: 'USDT', weight: 0.20 },
    ];
    datasets.balanced = {
      name: '균형형 (BTC 50% / ETH 30% / USDT 20%)',
      description: '메이저 코인 + 스테이블 헤지',
      holdings, portfolioCloses: gbmSeries(0.245, 0.85, 252, 'c-bal'),
      ...buildHoldings(holdings, COIN_PROFILES, '-bal'),
      cryptoExtras: { nvt_ratio: 87, active_address_momentum: 12.4,
                      volatility_adjusted_risk_score: 62, fundamental_divergence: -0.15,
                      btc_dominance: 0.50, stablecoin_ratio: 0.20 },
    };
  }

  {
    const holdings = [
      { symbol: 'USDT', weight: 0.40 },
      { symbol: 'USDC', weight: 0.20 },
      { symbol: 'BTC', weight: 0.25 },
      { symbol: 'ETH', weight: 0.15 },
    ];
    datasets.conservative = {
      name: '스테이블 60% 안정형',
      description: '스테이블코인 헤지 중심 운용',
      holdings, portfolioCloses: gbmSeries(0.082, 0.32, 252, 'c-stable'),
      ...buildHoldings(holdings, COIN_PROFILES, '-stable'),
      cryptoExtras: { nvt_ratio: 95, active_address_momentum: 12.4,
                      volatility_adjusted_risk_score: 78, fundamental_divergence: -0.05,
                      btc_dominance: 0.25, stablecoin_ratio: 0.60 },
    };
  }

  {
    const holdings = [
      { symbol: 'SOL', weight: 0.30 },
      { symbol: 'ETH', weight: 0.25 },
      { symbol: 'AVAX', weight: 0.18 },
      { symbol: 'DOGE', weight: 0.12 },
      { symbol: 'BTC', weight: 0.15 },
    ];
    datasets.aggressive = {
      name: '알트코인 중심',
      description: 'BTC 15% / 알트 85% 고변동성',
      holdings, portfolioCloses: gbmSeries(0.412, 1.45, 252, 'c-alt'),
      ...buildHoldings(holdings, COIN_PROFILES, '-alt'),
      cryptoExtras: { nvt_ratio: 165, active_address_momentum: 25.3,
                      volatility_adjusted_risk_score: 32, fundamental_divergence: 0.62,
                      btc_dominance: 0.15, stablecoin_ratio: 0.0 },
    };
  }

  {
    const holdings = [{ symbol: 'BTC', weight: 1.0 }];
    datasets.btc_only = {
      name: 'BTC 단일 보유',
      description: '비트코인 100% — 디지털 골드 전략',
      holdings, portfolioCloses: gbmSeries(0.285, 0.78, 252, 'c-btc'),
      ...buildHoldings(holdings, COIN_PROFILES, '-btc'),
      cryptoExtras: { nvt_ratio: 87, active_address_momentum: 18.5,
                      volatility_adjusted_risk_score: 55, fundamental_divergence: 0.10,
                      btc_dominance: 1.0, stablecoin_ratio: 0.0 },
    };
  }

  {
    const holdings = [
      { symbol: 'ETH', weight: 0.30 },
      { symbol: 'UNI', weight: 0.25 },
      { symbol: 'AAVE', weight: 0.20 },
      { symbol: 'LINK', weight: 0.15 },
      { symbol: 'USDC', weight: 0.10 },
    ];
    datasets.defi = {
      name: 'DeFi 토큰 포트폴리오',
      description: 'DeFi 생태계 토큰 (UNI · AAVE · LINK)',
      holdings, portfolioCloses: gbmSeries(0.218, 1.05, 252, 'c-defi'),
      ...buildHoldings(holdings, COIN_PROFILES, '-defi'),
      cryptoExtras: { nvt_ratio: 124, active_address_momentum: 32.1,
                      volatility_adjusted_risk_score: 48, fundamental_divergence: 0.35,
                      btc_dominance: 0.0, stablecoin_ratio: 0.10 },
    };
  }

  {
    const holdings = [
      { symbol: 'DOGE', weight: 0.45 },
      { symbol: 'SHIB', weight: 0.35 },
      { symbol: 'BTC', weight: 0.10 },
      { symbol: 'ETH', weight: 0.10 },
    ];
    datasets.meme = {
      name: '밈코인 중심 (위험 사례)',
      description: 'DOGE/SHIB 80% — 극단적 변동성',
      holdings, portfolioCloses: gbmSeries(0.085, 1.85, 252, 'c-meme'),
      ...buildHoldings(holdings, COIN_PROFILES, '-meme'),
      cryptoExtras: { nvt_ratio: 245, active_address_momentum: -8.2,
                      volatility_adjusted_risk_score: 18, fundamental_divergence: 1.15,
                      btc_dominance: 0.10, stablecoin_ratio: 0.0 },
    };
  }

  return datasets;
}

const DATASETS = {
  'insight-forge-default': makeDefaultDatasets(),
  'insight-forge-crypto': makeCryptoDatasets(),
};

// ============================================================
// 외부 API
// ============================================================

export function getDataset(bundleId, datasetId) {
  return DATASETS[bundleId]?.[datasetId] || DATASETS['insight-forge-default'].balanced;
}

export function getDatasetList(bundleId) {
  const bundle = DATASETS[bundleId];
  if (!bundle) return [];
  return Object.entries(bundle).map(([id, ds]) => ({
    id, name: ds.name, description: ds.description,
  }));
}

/**
 * 사용자 업로드 데이터를 데이터셋으로 빌드
 * data-rules.md의 컬럼 매핑 + 비중 정규화 적용
 * 
 * @param {Array<{symbol: string, weight: number}>} rawHoldings
 * @param {string} bundleId
 * @returns {Object} 데이터셋 객체 (getDataset과 동일 구조)
 */
export function buildUserDataset(rawHoldings, bundleId = 'insight-forge-default') {
  const isCrypto = bundleId === 'insight-forge-crypto';
  const profiles = isCrypto ? COIN_PROFILES : STOCK_PROFILES;
  const seedSuffix = '-user-' + Date.now();

  const holdings = rawHoldings.map(h => ({
    symbol: h.symbol,
    weight: parseFloat(h.weight) || 0,
  }));

  // 시계열 — 알 수 없는 종목은 평균적인 변동성 추정
  const returnsBySymbol = {};
  const symbolReturns = [];
  let totalRet = 0;
  let totalVol = 0;
  holdings.forEach((h, i) => {
    const profile = profiles[h.symbol] || { 
      ret: 0.10 + (Math.random() - 0.5) * 0.1, 
      vol: 0.25 + Math.random() * 0.15, 
      seed: 'unknown-' + h.symbol + '-' + i 
    };
    returnsBySymbol[h.symbol] = gbmSeries(
      profile.ret, profile.vol, 252, profile.seed + seedSuffix
    ).map(p => p.y);
    symbolReturns.push({ name: h.symbol, value: profile.ret * 100 });
    totalRet += h.weight * profile.ret;
    totalVol += h.weight * profile.vol;
  });

  const portfolioCloses = gbmSeries(totalRet, totalVol * 0.8, 252, 'user-port' + seedSuffix);

  const dataset = {
    name: '업로드 포트폴리오',
    description: `사용자 정의 (${holdings.length}종목)`,
    holdings,
    portfolioCloses,
    returnsBySymbol,
    symbolReturns,
    isUserData: true,
  };

  // crypto 도메인이면 온체인 메트릭 추정
  if (isCrypto) {
    const btcWeight = holdings.find(h => h.symbol === 'BTC')?.weight || 0;
    const stableWeight = holdings.filter(h => ['USDT', 'USDC', 'DAI'].includes(h.symbol))
      .reduce((acc, h) => acc + h.weight, 0);
    dataset.cryptoExtras = {
      nvt_ratio: 100 + Math.round(totalVol * 50),
      active_address_momentum: 10 + Math.random() * 15,
      volatility_adjusted_risk_score: Math.max(20, Math.min(85, 100 - totalVol * 50)),
      fundamental_divergence: (Math.random() - 0.4) * 0.8,
      btc_dominance: btcWeight,
      stablecoin_ratio: stableWeight,
    };
  }

  return dataset;
}

// ============================================================
// 실시간 데이터 (Yahoo Finance via Vercel Serverless)
// ============================================================

async function fetchCachedSeries(symbol) {
  try {
    const filename = symbol.replace(/[/.]/g, '_');
    const res = await fetch(`/data/cache/${filename}.json`);
    if (!res.ok) throw new Error('cache miss');
    const data = await res.json();
    return { success: true, source: 'cache', ...data };
  } catch {
    // 캐시도 없으면 GBM 시뮬레이션으로 최종 폴백
    const sim = gbmSeries(0.10, 0.25, 252, symbol);
    return {
      success: false,
      source: 'simulation',
      series: sim.map((p, i) => ({
        date: new Date(Date.now() - (252 - i) * 86400000).toISOString().split('T')[0],
        close: p.y,
      })),
    };
  }
}

/**
 * 단일 종목 시계열 fetch (live → cache → simulation 순으로 폴백)
 */
export async function fetchRealSeries(symbol) {
  try {
    const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1y`);
    const data = await res.json();
    if (data.source === 'live' && data.series?.length > 0) {
      return { success: true, source: 'live', series: data.series, meta: data.meta, fetchedAt: data.fetchedAt };
    }
    return fetchCachedSeries(symbol);
  } catch {
    return fetchCachedSeries(symbol);
  }
}

/**
 * 복수 종목 실시간 포트폴리오 데이터셋 빌드
 * @param {Array<{symbol: string, weight: number}>} userHoldings - 종목명 (symbolMap 키 or Yahoo 심볼)
 */
export async function buildLiveDataset(userHoldings) {
  const fetched = await Promise.all(
    userHoldings.map(async (h) => {
      const yahooSym = getYahooSymbol(h.symbol);
      const result = await fetchRealSeries(yahooSym);
      return { symbol: h.symbol, yahooSym, weight: h.weight, ...result };
    })
  );

  const minLength = Math.min(...fetched.map(f => f.series.length));

  // 가중평균 포트폴리오 시계열 (기준가 100 정규화)
  const portfolioCloses = [];
  for (let i = 0; i < minLength; i++) {
    let total = 0;
    fetched.forEach(f => {
      const startPrice = f.series[0].close;
      total += (f.series[i].close / startPrice) * 100 * f.weight;
    });
    portfolioCloses.push({ x: i, y: total });
  }

  const returnsBySymbol = {};
  fetched.forEach(f => {
    returnsBySymbol[f.symbol] = f.series.slice(0, minLength).map(s => s.close);
  });

  const symbolReturns = fetched.map(f => ({
    name: f.symbol,
    value: parseFloat(
      ((f.series[f.series.length - 1].close / f.series[0].close - 1) * 100).toFixed(2)
    ),
  }));

  return {
    name: '실시간 포트폴리오',
    description: `${userHoldings.length}종목 · Yahoo Finance 기반`,
    holdings: userHoldings,
    portfolioCloses,
    returnsBySymbol,
    symbolReturns,
    isLiveData: true,
    sources: fetched.map(f => ({ symbol: f.symbol, source: f.source })),
  };
}
