# 🚧 다음 작업: B-2 (Yahoo Finance 실시간 연동)

> Claude Code가 이 문서를 따라 진행하면 됩니다.

---

## 🎯 목표

지금은 **GBM 시뮬레이션**으로 가짜 시계열을 만든다.  
이걸 **Vercel Serverless Function + Yahoo Finance**로 진짜 시세 데이터로 교체한다.

### 왜 이게 필요한가
- 현재: "더미 데이터로 작동하는 척"
- 목표: "사용자가 실제 종목명 입력 → 진짜 Yahoo Finance 데이터로 분석"
- 점수 효과: 범용성 25점 만점 + 실용성 점수 ↑

### 왜 Vercel Serverless Function인가
- Yahoo Finance는 공식 무료 API 없음 → 비공식 엔드포인트 사용
- 비공식이라 CORS 차단됨 → 브라우저에서 직접 호출 불가
- Vercel 함수가 서버 사이드에서 호출 → 우리 도메인으로 응답
- 결과: CORS 우회 + 백엔드 서버 따로 안 만들어도 됨

---

## 📋 단계별 작업

### Step 1: api/stock.js 작성 (30분)

**위치**: `api/stock.js` (프로젝트 루트)

Vercel은 `api/` 폴더 안의 파일을 자동으로 Serverless Function으로 배포한다.

**역할**: 클라이언트의 `/api/stock?symbol=005930.KS&range=1y` 요청 → Yahoo Finance에 우회 호출 → 시계열 데이터 반환

**구현 가이드**:
```javascript
// api/stock.js
export default async function handler(req, res) {
  const { symbol, range = '1y', interval = '1d' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol 파라미터 필요' });
  }

  // CORS 헤더 (같은 도메인이라 사실 필요없지만 안전을 위해)
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart?.error) {
      throw new Error(data.chart.error.description || 'Yahoo error');
    }

    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error('No data returned');
    }

    // 클라이언트가 쓰기 좋은 형태로 변환
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const series = timestamps.map((t, i) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      close: closes[i],
    })).filter(p => p.close != null);

    return res.status(200).json({
      source: 'live',
      symbol,
      meta: {
        currency: result.meta?.currency,
        exchangeName: result.meta?.exchangeName,
        instrumentType: result.meta?.instrumentType,
        firstTradeDate: result.meta?.firstTradeDate,
      },
      series,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Yahoo 죽으면 캐시 폴백 시도
    return res.status(503).json({
      source: 'error',
      symbol,
      error: error.message,
      fallback: 'cache',
    });
  }
}
```

**검증**:
```bash
npm run dev
# 다른 터미널에서:
curl http://localhost:5173/api/stock?symbol=005930.KS
```
※ Vite의 dev 서버는 Vercel API를 자동 인식 안 함. 검증은 `vercel dev` 또는 배포 후에 가능.

---

### Step 2: 종목 검색 UI 추가 (30분)

**위치**: `src/components/StockSearch.jsx` (새 파일)

**역할**: 사용자가 "삼성전자" 입력 → 자동 매핑 → Yahoo 심볼(005930.KS)로 변환

**종목 매핑 테이블** (KRX + 미국 대형주):
```javascript
// src/core/symbolMap.js (새 파일)
export const SYMBOL_MAP = {
  // 한국 대형주 (Yahoo 심볼: 코드.KS)
  '삼성전자': '005930.KS',
  'SK하이닉스': '000660.KS',
  'NAVER': '035420.KS',
  '카카오': '035720.KS',
  'LG에너지솔루션': '373220.KS',
  '현대차': '005380.KS',
  '셀트리온': '068270.KS',
  '삼성바이오로직스': '207940.KS',
  'POSCO홀딩스': '005490.KS',
  '에코프로비엠': '247540.KQ',
  // ETF
  'KODEX 200': '069500.KS',
  'KODEX 국고채': '114260.KS',
  'KODEX 고배당': '279530.KS',
  'TIGER 미국S&P500': '360750.KS',
  'KODEX 반도체': '091160.KS',
  'KODEX 2차전지': '305720.KS',
  // 미국 대형주
  'Apple': 'AAPL',
  'Microsoft': 'MSFT',
  'Google': 'GOOGL',
  'NVIDIA': 'NVDA',
  'Tesla': 'TSLA',
  // 암호화폐
  'BTC': 'BTC-USD',
  'ETH': 'ETH-USD',
  'SOL': 'SOL-USD',
};

export function getYahooSymbol(name) {
  return SYMBOL_MAP[name] || name;
}
```

**컴포넌트**:
```jsx
// src/components/StockSearch.jsx
import { useState } from 'react';
import { SYMBOL_MAP } from '../core/symbolMap.js';

export default function StockSearch({ onAdd }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (v.trim()) {
      const matched = Object.keys(SYMBOL_MAP)
        .filter(name => name.toLowerCase().includes(v.toLowerCase()))
        .slice(0, 8);
      setSuggestions(matched);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="if-search">
      <input
        type="text"
        placeholder="종목명 검색 (예: 삼성전자)"
        value={query}
        onChange={handleChange}
        className="if-search__input"
      />
      {suggestions.length > 0 && (
        <ul className="if-search__suggestions">
          {suggestions.map(name => (
            <li key={name} onClick={() => { onAdd(name); setQuery(''); setSuggestions([]); }}>
              {name} <span className="if-search__sym">{SYMBOL_MAP[name]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

CSS는 `Dashboard.css`에 추가.

---

### Step 3: datasets.js에 fetch 모드 추가 (30분)

**위치**: `src/core/datasets.js`

**현재 구조**:
```javascript
// 현재: GBM으로 더미 시계열 생성
function gbmSeries(targetCumReturn, annualVol, days, seed) { ... }
```

**추가할 함수**:
```javascript
/**
 * Yahoo Finance에서 진짜 시세 데이터 가져오기
 * Vercel Serverless Function (/api/stock)을 경유
 */
export async function fetchRealSeries(symbol) {
  try {
    const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1y`);
    const data = await res.json();
    
    if (data.source === 'live' && data.series.length > 0) {
      return {
        success: true,
        source: 'live',
        series: data.series,
        meta: data.meta,
        fetchedAt: data.fetchedAt,
      };
    }
    
    // Yahoo 실패 → 캐시 폴백
    return await fetchCachedSeries(symbol);
  } catch (e) {
    return await fetchCachedSeries(symbol);
  }
}

async function fetchCachedSeries(symbol) {
  try {
    const res = await fetch(`/data/cache/${symbol}.json`);
    if (!res.ok) throw new Error('cache miss');
    const data = await res.json();
    return { success: true, source: 'cache', ...data };
  } catch (e) {
    // 캐시도 없으면 GBM 시뮬레이션으로 최종 폴백
    return {
      success: false,
      source: 'simulation',
      series: gbmSeries(0.10, 0.25, 252, symbol).map((p, i) => ({
        date: new Date(Date.now() - (252-i)*86400000).toISOString().split('T')[0],
        close: p.y,
      })),
    };
  }
}

/**
 * 실시간 모드로 사용자 포트폴리오 분석
 * @param {Array<{symbol, weight}>} userHoldings
 * @returns {Promise<Dataset>}
 */
export async function buildLiveDataset(userHoldings, bundleId) {
  const fetched = await Promise.all(
    userHoldings.map(async h => {
      const yahooSym = getYahooSymbol(h.symbol);
      const result = await fetchRealSeries(yahooSym);
      return { symbol: h.symbol, weight: h.weight, ...result };
    })
  );

  // 각 종목의 시계열을 가중평균 → 포트폴리오 시계열
  const minLength = Math.min(...fetched.map(f => f.series.length));
  const portfolioCloses = [];
  for (let i = 0; i < minLength; i++) {
    let total = 0;
    fetched.forEach(f => {
      const startPrice = f.series[0].close;
      const norm = (f.series[i].close / startPrice) * 100;
      total += norm * f.weight;
    });
    portfolioCloses.push({ x: i, y: total });
  }

  // returnsBySymbol 구성
  const returnsBySymbol = {};
  fetched.forEach(f => {
    returnsBySymbol[f.symbol] = f.series.map(s => s.close);
  });

  // 종목별 수익률
  const symbolReturns = fetched.map(f => {
    const ret = (f.series[f.series.length-1].close / f.series[0].close - 1) * 100;
    return { name: f.symbol, value: ret };
  });

  return {
    name: '실시간 분석',
    description: `${userHoldings.length}종목 · 실제 시세 기반`,
    holdings: userHoldings,
    portfolioCloses,
    returnsBySymbol,
    symbolReturns,
    isLiveData: true,
    sources: fetched.map(f => ({ symbol: f.symbol, source: f.source })),
  };
}
```

---

### Step 4: useStore에 실시간 모드 추가 (15분)

**위치**: `src/store/useStore.js`

```javascript
// 새 상태
isLiveLoading: false,
liveError: null,

// 새 액션
applyLiveData: async (userHoldings) => {
  set({ isLiveLoading: true, liveError: null });
  try {
    const { bundleId } = get();
    const dataset = await buildLiveDataset(userHoldings, bundleId);
    set({
      userDataset: dataset,
      datasetId: '__live__',
      isLiveLoading: false,
    });
  } catch (e) {
    set({ liveError: e.message, isLiveLoading: false });
  }
},
```

---

### Step 5: 캐시 백업 스크립트 (30분)

**위치**: `scripts/build-cache.mjs` (새 파일)

빌드 시점에 한 번 Yahoo Finance에서 30개 종목 데이터를 받아 `public/data/cache/`에 저장.

```javascript
// scripts/build-cache.mjs
import { writeFileSync, mkdirSync } from 'fs';

const SYMBOLS = [
  '005930.KS', '000660.KS', '035420.KS', '035720.KS', '373220.KS',
  '005380.KS', '068270.KS', '207940.KS', '005490.KS', '247540.KQ',
  '069500.KS', '114260.KS', '279530.KS', '360750.KS', '091160.KS',
  '305720.KS',
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'AMZN', 'BRK-B',
  'BTC-USD', 'ETH-USD', 'SOL-USD',
];

const CACHE_DIR = './public/data/cache';
mkdirSync(CACHE_DIR, { recursive: true });

for (const symbol of SYMBOLS) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) continue;
    
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const series = timestamps.map((t, i) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      close: closes[i],
    })).filter(p => p.close != null);
    
    writeFileSync(`${CACHE_DIR}/${symbol}.json`, JSON.stringify({
      symbol,
      series,
      meta: result.meta,
      cachedAt: new Date().toISOString(),
    }));
    console.log(`✅ ${symbol} (${series.length}일치)`);
  } catch (e) {
    console.log(`❌ ${symbol}: ${e.message}`);
  }
  // Rate limit 회피
  await new Promise(r => setTimeout(r, 200));
}
```

**실행**:
```bash
node scripts/build-cache.mjs
```

→ `public/data/cache/` 안에 30개 .json 파일 생성됨.

`package.json`에 스크립트 추가:
```json
"scripts": {
  "build-cache": "node scripts/build-cache.mjs",
  ...
}
```

---

### Step 6: UI 개선 (30분)

#### 6-1. 헤더에 모드 토글 추가

`Dashboard.jsx`에서:
- "더미 데이터" / "실시간 데이터" 토글 버튼
- 실시간 모드일 때 종목 검색 UI 표시
- 데이터 출처 표시 (live / cache / simulation)

#### 6-2. Hero 영역에 데이터 출처 뱃지

```jsx
{userDataset?.sources && (
  <div className="if-source-badges">
    {userDataset.sources.map(s => (
      <span className={`if-source-badge if-source-badge--${s.source}`}>
        {s.symbol} · {s.source === 'live' ? '실시간' : s.source === 'cache' ? '캐시' : '시뮬'}
      </span>
    ))}
  </div>
)}
```

#### 6-3. 로딩 / 에러 UI

`isLiveLoading: true` 시 스피너 표시.  
`liveError`가 있으면 에러 메시지 + 재시도 버튼.

---

### Step 7: 빌드 + 배포 검증 (15분)

```bash
# 캐시 백업 먼저 빌드
npm run build-cache

# 프로덕션 빌드
npm run build

# 로컬 검증 (Vercel 함수는 vercel dev 필요)
npm i -g vercel
vercel dev

# 배포
git add .
git commit -m "feat: Yahoo Finance 실시간 연동 (B-2)"
git push
# → Vercel 자동 재배포
```

---

## ✅ 완료 체크리스트

- [ ] `api/stock.js` 작성 + 로컬 검증 (`vercel dev`)
- [ ] `src/core/symbolMap.js` 작성
- [ ] `src/components/StockSearch.jsx` 작성 + CSS
- [ ] `src/core/datasets.js`에 `fetchRealSeries`, `buildLiveDataset` 추가
- [ ] `src/store/useStore.js`에 `applyLiveData` 추가
- [ ] `scripts/build-cache.mjs` 작성 + 실행 → 30개 .json 생성
- [ ] `Dashboard.jsx`에 모드 토글 + 데이터 출처 뱃지 + 로딩/에러 UI
- [ ] 빌드 통과 (`npm run build`)
- [ ] Vercel 배포 + 실제 동작 확인
- [ ] README.md에 "실시간 데이터 사용법" 섹션 추가

---

## ⚠️ 트러블슈팅

### Q. Vercel 배포 후 `/api/stock` 호출 시 404
- `api/` 폴더가 프로젝트 루트에 있어야 함 (src/ 안 X)
- `vercel.json`의 rewrites가 `/api/*` 경로를 가로채면 안 됨

### Q. Yahoo Finance가 401/403 반환
- User-Agent 헤더 필수
- Rate limit 걸렸으면 잠시 후 재시도
- IP 차단되면 캐시 폴백으로 대응

### Q. 한국 종목 코드 매핑 모름
- 6자리 코드.KS (코스피) / .KQ (코스닥)
- 예: 삼성전자 → `005930.KS`
- 미국 종목은 그냥 티커 (예: `AAPL`)
- 암호화폐는 `BTC-USD`, `ETH-USD`

### Q. CORS 에러 여전히 남
- Vercel 함수 응답에 `Access-Control-Allow-Origin: *` 헤더 추가
- 같은 도메인에서 호출하면 사실 CORS 안 막힘 (배포 후엔 문제 없음)

---

## 🎯 작업 완료 후

1. `docs/HANDOFF.md` 업데이트 — "B-2 완료" 표시
2. README에 "실제 시세 데이터 지원" 강조 추가
3. 기획서·발표 자료에 반영
4. Vercel URL 받아서 → DACON 제출

---

**예상 시간: 약 3시간**

화이팅! 🚀
