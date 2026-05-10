// 종목명 → Yahoo Finance 심볼 매핑
// 한국: 6자리코드.KS (코스피) / .KQ (코스닥)
// 미국: 티커 그대로 / 암호화폐: TICKER-USD
export const SYMBOL_MAP = {
  // 한국 대형주
  '삼성전자':         '005930.KS',
  'SK하이닉스':       '000660.KS',
  'NAVER':            '035420.KS',
  '카카오':           '035720.KS',
  'LG에너지솔루션':   '373220.KS',
  '현대차':           '005380.KS',
  '셀트리온':         '068270.KS',
  '삼성바이오로직스': '207940.KS',
  'POSCO홀딩스':      '005490.KS',
  '에코프로비엠':     '247540.KQ',
  '카카오게임즈':     '293490.KQ',
  'KB금융':           '105560.KS',
  '신한지주':         '055550.KS',
  '하나금융지주':     '086790.KS',
  '삼성SDI':          '006400.KS',
  'LG화학':           '051910.KS',
  '현대모비스':       '012330.KS',
  '기아':             '000270.KS',
  // ETF
  'KODEX 200':        '069500.KS',
  'KODEX 국고채':     '114260.KS',
  'KODEX 고배당':     '279530.KS',
  'TIGER 미국S&P500': '360750.KS',
  'KODEX 반도체':     '091160.KS',
  'KODEX 2차전지':    '305720.KS',
  'TIGER 나스닥100':  '133690.KS',
  // 미국 대형주
  'Apple':            'AAPL',
  'Microsoft':        'MSFT',
  'Google':           'GOOGL',
  'NVIDIA':           'NVDA',
  'Tesla':            'TSLA',
  'Meta':             'META',
  'Amazon':           'AMZN',
  'Berkshire':        'BRK-B',
  'JPMorgan':         'JPM',
  'Johnson & Johnson':'JNJ',
  'Visa':             'V',
  'Walmart':          'WMT',
  // 암호화폐
  'BTC':              'BTC-USD',
  'Bitcoin':          'BTC-USD',
  'ETH':              'ETH-USD',
  'Ethereum':         'ETH-USD',
  'SOL':              'SOL-USD',
  'Solana':           'SOL-USD',
  'BNB':              'BNB-USD',
  'AVAX':             'AVAX-USD',
  'DOGE':             'DOGE-USD',
};

/** 종목명 → Yahoo 심볼 변환. 매핑 없으면 입력값 그대로 반환 */
export function getYahooSymbol(name) {
  return SYMBOL_MAP[name] || name;
}

/** Yahoo 심볼 → 종목명 역방향 검색 */
export function getNameFromSymbol(symbol) {
  return Object.entries(SYMBOL_MAP).find(([, v]) => v === symbol)?.[0] || symbol;
}
