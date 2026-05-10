/**
 * Twelve Data 캐시 빌드 스크립트
 * 실행: TWELVEDATA_API_KEY=your_key node scripts/build-cache.mjs
 * 결과: public/data/cache/{symbol}.json (종목별 1년치 시계열)
 *
 * Twelve Data 무료 티어: 분당 8회 → 심볼 간 8초 딜레이
 */

import { writeFileSync, mkdirSync } from 'fs';

const API_KEY = process.env.TWELVEDATA_API_KEY;
if (!API_KEY) {
  console.error('❌ TWELVEDATA_API_KEY 환경변수를 설정하세요.');
  console.error('   예: TWELVEDATA_API_KEY=your_key node scripts/build-cache.mjs');
  process.exit(1);
}

const SYMBOLS = [
  // 한국 대형주 / ETF (KOSPI)
  '005930.KRX', '000660.KRX', '035420.KRX', '035720.KRX', '373220.KRX',
  '005380.KRX', '068270.KRX', '207940.KRX', '005490.KRX',
  '069500.KRX', '114260.KRX', '279530.KRX', '360750.KRX', '091160.KRX',
  '305720.KRX',
  // 한국 (KOSDAQ)
  '247540.KOSDAQ',
  // 미국 대형주
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN',
  // 암호화폐
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD',
];

const CACHE_DIR = './public/data/cache';
mkdirSync(CACHE_DIR, { recursive: true });

let ok = 0;
let fail = 0;

console.log(`총 ${SYMBOLS.length}개 심볼 · 분당 8회 제한 → 심볼당 ~8초\n`);

for (const symbol of SYMBOLS) {
  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=252&apikey=${API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.status === 'error') throw new Error(data.message || 'API error');
    if (!data.values?.length) throw new Error('no data');

    const series = [...data.values].reverse().map(v => ({
      date: v.datetime.slice(0, 10),
      close: parseFloat(v.close),
    })).filter(p => !isNaN(p.close));

    const payload = {
      symbol,
      series,
      meta: {
        currency: data.meta?.currency,
        exchangeName: data.meta?.exchange,
        longName: data.meta?.name || symbol,
      },
      cachedAt: new Date().toISOString(),
    };

    const filename = symbol.replace(/[/.]/g, '_');
    writeFileSync(`${CACHE_DIR}/${filename}.json`, JSON.stringify(payload));
    console.log(`✅ ${symbol.padEnd(16)} ${series.length}일치`);
    ok++;
  } catch (e) {
    console.log(`❌ ${symbol.padEnd(16)} ${e.message}`);
    fail++;
  }

  // 분당 8회 제한 회피 (8초 딜레이)
  await new Promise(r => setTimeout(r, 8000));
}

console.log(`\n완료: ${ok}개 성공 / ${fail}개 실패`);
