export default async function handler(req, res) {
  const { symbol, interval = '1day', outputsize = 252 } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol 파라미터 필요' });
  }

  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TWELVEDATA_API_KEY 환경변수 미설정' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Twelve Data HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Twelve Data error');
    }

    if (!data.values || data.values.length === 0) {
      throw new Error('No data returned');
    }

    // Twelve Data는 최신순 → 역순으로 변환 (오래된 것 먼저)
    const series = [...data.values].reverse().map(v => ({
      date: v.datetime.slice(0, 10),
      close: parseFloat(v.close),
    })).filter(p => !isNaN(p.close));

    return res.status(200).json({
      source: 'live',
      symbol,
      meta: {
        currency: data.meta?.currency,
        exchangeName: data.meta?.exchange,
        instrumentType: data.meta?.type,
        longName: data.meta?.name || symbol,
      },
      series,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      source: 'error',
      symbol,
      error: error.message,
      fallback: 'cache',
    });
  }
}
