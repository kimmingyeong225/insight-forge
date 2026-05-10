// 한국 주식 판별: 6자리 숫자 (접미사 없거나 .KRX/.KOSDAQ)
function isKorean(symbol) {
  return /^\d{6}(\.KRX|\.KOSDAQ)?$/.test(symbol);
}

// 6자리 종목코드 추출
function toSrtnCd(symbol) {
  return symbol.replace(/\.(KRX|KOSDAQ)$/, '');
}

// YYYYMMDD 포맷
function toYMD(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// "20250510" → "2025-05-10"
function fmtBasDt(basDt) {
  return `${basDt.slice(0, 4)}-${basDt.slice(4, 6)}-${basDt.slice(6, 8)}`;
}

// ── KRX 공공데이터 API ───────────────────────────────────────
async function fetchKrx(symbol) {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) throw new Error('DATA_GO_KR_API_KEY 미설정');

  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const params = new URLSearchParams({
    serviceKey: apiKey,
    resultType:  'json',
    srtnCd:      toSrtnCd(symbol),
    beginBasDt:  toYMD(yearAgo),
    endBasDt:    toYMD(today),
    numOfRows:   '252',
  });

  const url = `https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo?${params}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`KRX HTTP ${response.status}`);

  const data = await response.json();

  const resultCode = data.response?.header?.resultCode;
  if (resultCode !== '00') {
    throw new Error(`KRX 에러: ${data.response?.header?.resultMsg ?? resultCode}`);
  }

  const rawItems = data.response?.body?.items?.item;
  if (!rawItems) throw new Error('KRX: 데이터 없음');

  // 단일 아이템일 때 객체로 오는 경우 대비
  const items = [].concat(rawItems);
  if (items.length === 0) throw new Error('KRX: 빈 배열');

  // KRX는 최신순 → 역순 정렬
  const series = [...items].reverse().map(v => ({
    date:  fmtBasDt(v.basDt),
    close: parseFloat(v.clpr),
  })).filter(p => !isNaN(p.close));

  return {
    source: 'live',
    symbol,
    meta: {
      currency:     'KRW',
      exchangeName: items[0]?.mrktCtg ?? 'KRX',
      longName:     items[0]?.itmsNm  ?? symbol,
    },
    series,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Twelve Data API ──────────────────────────────────────────
async function fetchTwelveData(symbol, interval, outputsize) {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) throw new Error('TWELVEDATA_API_KEY 미설정');

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`);

  const data = await response.json();
  if (data.status === 'error') throw new Error(data.message ?? 'Twelve Data error');
  if (!data.values?.length) throw new Error('Twelve Data: 데이터 없음');

  const series = [...data.values].reverse().map(v => ({
    date:  v.datetime.slice(0, 10),
    close: parseFloat(v.close),
  })).filter(p => !isNaN(p.close));

  return {
    source: 'live',
    symbol,
    meta: {
      currency:        data.meta?.currency,
      exchangeName:    data.meta?.exchange,
      instrumentType:  data.meta?.type,
      longName:        data.meta?.name ?? symbol,
    },
    series,
    fetchedAt: new Date().toISOString(),
  };
}

// ── 핸들러 ───────────────────────────────────────────────────
export default async function handler(req, res) {
  const { symbol, interval = '1day', outputsize = 252 } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol 파라미터 필요' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  if (isKorean(symbol)) {
    // 한국 주식: KRX → Twelve Data 순으로 폴백
    try {
      const result = await fetchKrx(symbol);
      return res.status(200).json(result);
    } catch (krxErr) {
      try {
        const result = await fetchTwelveData(symbol, interval, outputsize);
        return res.status(200).json(result);
      } catch (tdErr) {
        return res.status(503).json({
          source:   'error',
          symbol,
          error:    `KRX: ${krxErr.message} / TwelveData: ${tdErr.message}`,
          fallback: 'cache',
        });
      }
    }
  }

  // 미국 주식 · 암호화폐: Twelve Data
  try {
    const result = await fetchTwelveData(symbol, interval, outputsize);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(503).json({
      source:   'error',
      symbol,
      error:    error.message,
      fallback: 'cache',
    });
  }
}
