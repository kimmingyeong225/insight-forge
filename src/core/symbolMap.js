// 종목명 → API 심볼 매핑
// 한국: 6자리 종목코드 (KRX 공공데이터 API)
// 미국: 티커 그대로 (Twelve Data)
// 암호화폐: TICKER/USD (Twelve Data)
export const SYMBOL_MAP = {
  // 한국 대형주 (KOSPI)
  '삼성전자':         '005930',
  'SK하이닉스':       '000660',
  'NAVER':            '035420',
  '카카오':           '035720',
  'LG에너지솔루션':   '373220',
  '현대차':           '005380',
  '셀트리온':         '068270',
  '삼성바이오로직스': '207940',
  'POSCO홀딩스':      '005490',
  'KB금융':           '105560',
  '신한지주':         '055550',
  '하나금융지주':     '086790',
  '삼성SDI':          '006400',
  'LG화학':           '051910',
  '현대모비스':       '012330',
  '기아':             '000270',
  // 한국 (KOSDAQ)
  '에코프로비엠':     '247540',
  '카카오게임즈':     '293490',
  // ETF (KOSPI)
  'KODEX 200':        '069500',
  'KODEX 국고채':     '114260',
  'KODEX 고배당':     '279530',
  'TIGER 미국S&P500': '360750',
  'KODEX 반도체':     '091160',
  'KODEX 2차전지':    '305720',
  'TIGER 나스닥100':  '133690',
  // 미국 대형주 (Twelve Data)
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
  // 암호화폐 (Twelve Data)
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

/** 종목명 → API 심볼 변환. 매핑 없으면 입력값 그대로 반환 */
export function getYahooSymbol(name) {
  return SYMBOL_MAP[name] || name;
}

/** API 심볼 → 종목명 역방향 검색 */
export function getNameFromSymbol(symbol) {
  return Object.entries(SYMBOL_MAP).find(([, v]) => v === symbol)?.[0] || symbol;
}
