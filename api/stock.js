export default async function handler(req, res) {
  const { symbol, range = '1y', interval = '1d' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol 파라미터 필요' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
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

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const series = timestamps
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        close: closes[i],
      }))
      .filter(p => p.close != null);

    return res.status(200).json({
      source: 'live',
      symbol,
      meta: {
        currency: result.meta?.currency,
        exchangeName: result.meta?.exchangeName,
        instrumentType: result.meta?.instrumentType,
        longName: result.meta?.longName,
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
