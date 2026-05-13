import { useState, useRef, useEffect } from 'react';
import { SYMBOL_MAP } from '../core/symbolMap.js';

const ALL_NAMES = Object.keys(SYMBOL_MAP);

// API 심볼 기준 dedupe — 같은 ticker의 더 긴 이름 우선 (Bitcoin over BTC 등)
const SUPPORTED_NAMES = (() => {
  const bySymbol = {};
  for (const [name, sym] of Object.entries(SYMBOL_MAP)) {
    if (!bySymbol[sym] || name.length > bySymbol[sym].length) bySymbol[sym] = name;
  }
  return Object.values(bySymbol);
})();

const QUICK_TAGS = [
  { label: '삼성전자', domain: 'stock' },
  { label: 'Apple',    domain: 'stock' },
  { label: 'NVIDIA',   domain: 'stock' },
  { label: 'Tesla',    domain: 'stock' },
  { label: 'Bitcoin',  domain: 'crypto' },
  { label: 'Ethereum', domain: 'crypto' },
  { label: 'Solana',   domain: 'crypto' },
];

export default function StockSearch({ onAdd, domain = 'stock' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setSuggestions([]);
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (v.trim()) {
      const matched = ALL_NAMES.filter(name =>
        name.toLowerCase().includes(v.toLowerCase()) ||
        SYMBOL_MAP[name].toLowerCase().includes(v.toLowerCase())
      ).slice(0, 8);
      setSuggestions(matched);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (name) => {
    onAdd(name);
    setQuery('');
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      // 첫 번째 제안 선택 또는 직접 입력
      if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      } else {
        onAdd(query.trim());
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  return (
    <div className="if-search-wrap">
      <div className="if-search" ref={wrapRef}>
        <div className="if-search__inner">
          <svg className="if-search__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            className="if-search__input"
            placeholder="어떤 종목을 분석해 볼까요? (삼성전자, AAPL, BTC...)"
            value={query}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            aria-label="종목 검색"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
          />
        </div>
        {focused && suggestions.length > 0 && (
          <ul className="if-search__suggestions" role="listbox">
            {suggestions.map(name => (
              <li
                key={name}
                role="option"
                className="if-search__item"
                onMouseDown={() => handleSelect(name)}
              >
                <span className="if-search__name">{name}</span>
                <span className="if-search__sym">{SYMBOL_MAP[name]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="if-search-disclaimer">
        ℹ️ 본 프로토타입은 원활한 라이브 시연과 시스템 안정성을 위해, 테스트에 최적화된 주요 {SUPPORTED_NAMES.length}개 종목을 기준으로 연동되어 있습니다.
      </div>

      <details className="if-search-supported">
        <summary className="if-search-supported__summary">📋 지원 종목 목록 보기 ({SUPPORTED_NAMES.length})</summary>
        <div className="if-search-supported__list">
          {SUPPORTED_NAMES.map(name => (
            <button
              key={name}
              type="button"
              className="if-search-supported__item"
              onClick={() => handleSelect(name)}
              title={`${name} 추가`}
            >
              {name}
            </button>
          ))}
        </div>
      </details>

      <div className="if-search-tags">
        <span className="if-search-tags__label">자주 찾는 종목:</span>
        {QUICK_TAGS.filter(t => t.domain === domain).map(({ label }) => (
          <button
            key={label}
            type="button"
            className="if-search-tag"
            onClick={() => handleSelect(label)}
          >
            #{label}
          </button>
        ))}
      </div>
    </div>
  );
}
