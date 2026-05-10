/**
 * Yahoo Finance 캐시 빌드 스크립트
 * 실행: node scripts/build-cache.mjs
 * 결과: public/data/cache/{symbol}.json (30개 종목 1년치 시계열)
 */

import { writeFileSync, mkdirSync } from 'fs';

const SYMBOLS = [
  // 한국 대형주 / ETF
  '005930.KS', '000660.KS', '035420.KS', '035720.KS', '373220.KS',
  '005380.KS', '068270.KS', '207940.KS', '005490.KS', '247540.KQ',
  '069500.KS', '114260.KS', '279530.KS', '360750.KS', '091160.KS',
  '305720.KS',
  // 미국 대형주
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN', 'BRK-B',
  // 암호화폐
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD',
];

const CACHE_DIR = './public/data/cache';
mkdirSync(CACHE_DIR, { recursive: true });

let ok = 0;
let fail = 0;

for (const symbol of SYMBOLS) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('no result');

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const series = timestamps
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        close: closes[i],
      }))
      .filter(p => p.close != null);

    const payload = {
      symbol,
      series,
      meta: {
        currency: result.meta?.currency,
        exchangeName: result.meta?.exchangeName,
        longName: result.meta?.longName,
      },
      cachedAt: new Date().toISOString(),
    };

    const filename = symbol.replace(/[/:]/g, '_');
    writeFileSync(`${CACHE_DIR}/${filename}.json`, JSON.stringify(payload));
    console.log(`✅ ${symbol.padEnd(14)} ${series.length}일치`);
    ok++;
  } catch (e) {
    console.log(`❌ ${symbol.padEnd(14)} ${e.message}`);
    fail++;
  }

  // Rate limit 회피 (200ms 딜레이)
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\n완료: ${ok}개 성공 / ${fail}개 실패`);
