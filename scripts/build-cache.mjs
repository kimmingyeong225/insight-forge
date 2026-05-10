/**
 * 캐시 빌드 스크립트
 * 실행: node scripts/build-cache.mjs
 * 결과: public/data/cache/{symbol}.json
 *
 * 한국 주식 → KRX 공공데이터 API
 * 미국·암호화폐 → Twelve Data (분당 8회 제한 → 8초 딜레이)
 */

import { writeFileSync, mkdirSync } from 'fs';

const KRX_KEY = process.env.DATA_GO_KR_API_KEY;
const TD_KEY  = process.env.TWELVEDATA_API_KEY;

if (!KRX_KEY && !TD_KEY) {
  console.error('❌ DATA_GO_KR_API_KEY 또는 TWELVEDATA_API_KEY 환경변수 필요');
  process.exit(1);
}

const KR_SYMBOLS = [
  '005930', '000660', '035420', '035720', '373220',
  '005380', '068270', '207940', '005490', '247540',
  '069500', '114260', '279530', '360750', '091160', '305720',
];

const INTL_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN',
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD',
];

const CACHE_DIR = './public/data/cache';
mkdirSync(CACHE_DIR, { recursive: true });

function toYMD(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function fmtBasDt(basDt) {
  return `${basDt.slice(0, 4)}-${basDt.slice(4, 6)}-${basDt.slice(6, 8)}`;
}

async function fetchKrx(symbol) {
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const params = new URLSearchParams({
    serviceKey: KRX_KEY,
    resultType:  'json',
    srtnCd:      symbol,
    beginBasDt:  toYMD(yearAgo),
    endBasDt:    toYMD(today),
    numOfRows:   '252',
  });

  const res = await fetch(
    `https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo?${params}`
  );
  if (!res.ok) throw new Error(`KRX HTTP ${res.status}`);

  const data = await res.json();
  if (data.response?.header?.resultCode !== '00') {
    throw new Error(`KRX: ${data.response?.header?.resultMsg}`);
  }

  const rawItems = data.response?.body?.items?.item;
  if (!rawItems) throw new Error('KRX: 데이터 없음');
  const items = [].concat(rawItems);

  const series = items
    .map(v => ({
      date:  fmtBasDt(v.basDt),
      close: parseFloat(String(v.clpr).replace(/,/g, '')),
    }))
    .filter(p => !isNaN(p.close) && p.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    symbol,
    series,
    meta: { currency: 'KRW', exchangeName: items[0]?.mrktCtg, longName: items[0]?.itmsNm },
    cachedAt: new Date().toISOString(),
  };
}

async function fetchTd(symbol) {
  const res = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=252&apikey=${TD_KEY}`
  );
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);

  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  if (!data.values?.length) throw new Error('Twelve Data: 데이터 없음');

  const series = [...data.values].reverse().map(v => ({
    date:  v.datetime.slice(0, 10),
    close: parseFloat(v.close),
  })).filter(p => !isNaN(p.close));

  return {
    symbol,
    series,
    meta: { currency: data.meta?.currency, exchangeName: data.meta?.exchange, longName: data.meta?.name },
    cachedAt: new Date().toISOString(),
  };
}

function saveCache(symbol, payload) {
  const filename = symbol.replace(/[/.]/g, '_');
  writeFileSync(`${CACHE_DIR}/${filename}.json`, JSON.stringify(payload));
}

let ok = 0, fail = 0;

// 한국 주식 (KRX API — 동시 요청 가능)
if (KRX_KEY) {
  console.log(`\n── 한국 주식 (KRX API) ─── ${KR_SYMBOLS.length}개`);
  for (const symbol of KR_SYMBOLS) {
    try {
      const payload = await fetchKrx(symbol);
      saveCache(symbol, payload);
      console.log(`✅ ${symbol.padEnd(8)} ${payload.series.length}일치  ${payload.meta.longName ?? ''}`);
      ok++;
    } catch (e) {
      console.log(`❌ ${symbol.padEnd(8)} ${e.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 300));
  }
} else {
  console.log('⚠ DATA_GO_KR_API_KEY 없음 — 한국 주식 스킵');
}

// 미국·암호화폐 (Twelve Data — 분당 8회 제한)
if (TD_KEY) {
  console.log(`\n── 미국·암호화폐 (Twelve Data) ─── ${INTL_SYMBOLS.length}개`);
  for (const symbol of INTL_SYMBOLS) {
    try {
      const payload = await fetchTd(symbol);
      saveCache(symbol, payload);
      console.log(`✅ ${symbol.padEnd(10)} ${payload.series.length}일치`);
      ok++;
    } catch (e) {
      console.log(`❌ ${symbol.padEnd(10)} ${e.message}`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 8000));
  }
} else {
  console.log('⚠ TWELVEDATA_API_KEY 없음 — 미국·암호화폐 스킵');
}

console.log(`\n완료: ${ok}개 성공 / ${fail}개 실패`);
