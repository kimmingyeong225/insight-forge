// 종목명 → Twelve Data 심볼 매핑
// 한국: 6자리코드.KRX (코스피) / 6자리코드.KOSDAQ (코스닥)
// 미국: 티커 그대로 / 암호화폐: TICKER/USD
export const SYMBOL_MAP = {
  // 한국 대형주 (KOSPI)
  '삼성전자':         '005930.KRX',
  'SK하이닉스':       '000660.KRX',
  'NAVER':            '035420.KRX',
  '카카오':           '035720.KRX',
  'LG에너지솔루션':   '373220.KRX',
  '현대차':           '005380.KRX',
  '셀트리온':         '068270.KRX',
  '삼성바이오로직스': '207940.KRX',
  'POSCO홀딩스':      '005490.KRX',
  'KB금융':           '105560.KRX',
  '신한지주':         '055550.KRX',
  '하나금융지주':     '086790.KRX',
  '삼성SDI':          '006400.KRX',
  'LG화학':           '051910.KRX',
  '현대모비스':       '012330.KRX',
  '기아':             '000270.KRX',
  // 한국 (KOSDAQ)
  '에코프로비엠':     '247540.KOSDAQ',
  '카카오게임즈':     '293490.KOSDAQ',
  // ETF (KOSPI)
  'KODEX 200':        '069500.KRX',
  'KODEX 국고채':     '114260.KRX',
  'KODEX 고배당':     '279530.KRX',
  'TIGER 미국S&P500': '360750.KRX',
  'KODEX 반도체':     '091160.KRX',
  'KODEX 2차전지':    '305720.KRX',
  'TIGER 나스닥100':  '133690.KRX',
  // 미국 대형주
  'Apple':            'AAPL',
  'Microsoft':        'MSFT',
  'Google':           'GOOGL',
  'NVIDIA':           'NVDA',
  'Tesla':            'TSLA',
  'Meta':             'META',
  'Amazon':           'AMZN',
  'Berkshire':        'BRK/B',
  'JPMorgan':         'JPM',
  'Johnson & Johnson':'JNJ',
  'Visa':             'V',
  'Walmart':          'WMT',
  // 암호화폐
  'BTC':              'BTC/USD',
  'Bitcoin':          'BTC/USD',
  'ETH':              'ETH/USD',
  'Ethereum':         'ETH/USD',
  'SOL':              'SOL/USD',
  'Solana':           'SOL/USD',
  'BNB':              'BNB/USD',
  'AVAX':             'AVAX/USD',
  'DOGE':             'DOGE/USD',
};

/** 종목명 → Twelve Data 심볼 변환. 매핑 없으면 입력값 그대로 반환 */
export function getYahooSymbol(name) {
  return SYMBOL_MAP[name] || name;
}

/** Twelve Data 심볼 → 종목명 역방향 검색 */
export function getNameFromSymbol(symbol) {
  return Object.entries(SYMBOL_MAP).find(([, v]) => v === symbol)?.[0] || symbol;
}
