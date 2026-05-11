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

// KRX API: 종목코드 → 종목명 (필터 보조용)
const KRX_NAME_MAP = {
  '005930': '삼성전자',   '000660': 'SK하이닉스',  '035420': 'NAVER',
  '035720': '카카오',     '373220': 'LG에너지솔루션','005380': '현대차',
  '068270': '셀트리온',   '207940': '삼성바이오로직스','005490': 'POSCO홀딩스',
  '105560': 'KB금융',     '055550': '신한지주',    '086790': '하나금융지주',
  '006400': '삼성SDI',    '051910': 'LG화학',      '012330': '현대모비스',
  '000270': '기아',       '247540': '에코프로비엠', '293490': '카카오게임즈',
  '069500': 'KODEX 200',  '114260': 'KODEX 국고채', '279530': 'KODEX 고배당',
  '360750': 'TIGER 미국S&P500','091160': 'KODEX 반도체','305720': 'KODEX 2차전지',
  '133690': 'TIGER 나스닥100',
};

// ── KRX 공공데이터 API ───────────────────────────────────────
async function fetchKrx(symbol) {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) throw new Error('DATA_GO_KR_API_KEY 미설정');

  const code = toSrtnCd(symbol);
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const params = new URLSearchParams({
    serviceKey:  apiKey,
    resultType:  'json',
    numOfRows:   '300',
    pageNo:      '1',
    likeSrtnCd:  code,       // srtnCd(미지원) → likeSrtnCd(단축코드 포함 검색)
    beginBasDt:  toYMD(yearAgo),
    endBasDt:    toYMD(today),
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
  const all = rawItems ? [].concat(rawItems) : [];

  // likeSrtnCd는 포함 검색이므로 srtnCd 정확 일치로 후처리 필터
  const filtered = all.filter(v => v.srtnCd === code);

  // 진단 로그 (Vercel Functions 탭에서 확인)
  console.log(`[KRX] url_code=${code} total=${all.length} filtered=${filtered.length} range=${filtered[0]?.basDt}~${filtered[filtered.length - 1]?.basDt}`);

  if (filtered.length < 30) {
    throw new Error(`KRX 시계열 부족 (${filtered.length}개) — Twelve Data 폴백`);
  }

  const series = filtered
    .map(v => ({
      date:  v.basDt.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
      close: parseFloat(String(v.clpr).replace(/,/g, '')),
    }))
    .filter(p => !isNaN(p.close) && p.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    source: 'live',
    symbol,
    meta: {
      currency:     'KRW',
      exchangeName: filtered[0]?.mrktCtg ?? 'KRX',
      longName:     filtered[0]?.itmsNm  ?? code,
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
