import { useState } from 'react';
import { mapColumns } from '../core/normalizer.js';

/**
 * 데이터 업로드 모달
 * 
 * data-rules.md의 컬럼 매핑 규칙을 실제로 적용하여
 * 사용자 CSV/JSON 데이터를 시스템 표준 스키마로 변환한다.
 * 
 * 지원 형식:
 *  - CSV: symbol,weight 또는 종목,비중
 *  - JSON: [{symbol, weight}] 배열
 */
export default function DataUploader({ open, onClose, onApply }) {
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  if (!open) return null;

  // 샘플 데이터
  const sampleCSV = `종목,비중
삼성전자,0.35
SK하이닉스,0.25
NAVER,0.20
LG에너지솔루션,0.15
KODEX 200,0.05`;

  const sampleJSON = `[
  {"symbol": "삼성전자", "weight": 0.35},
  {"symbol": "SK하이닉스", "weight": 0.25},
  {"symbol": "NAVER", "weight": 0.20},
  {"symbol": "LG에너지솔루션", "weight": 0.15},
  {"symbol": "KODEX 200", "weight": 0.05}
]`;

  function parsePastedText(text) {
    if (!text.trim()) return null;
    const trimmed = text.trim();

    // JSON 시도
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const data = JSON.parse(trimmed);
        const arr = Array.isArray(data) ? data : [data];
        return arr.map(row => {
          const mapped = mapColumns(row);
          return {
            symbol: mapped.symbol || row.symbol || row.종목 || row.종목명,
            weight: parseFloat(mapped.weight ?? row.weight ?? row.비중 ?? row.가중치 ?? 0),
          };
        }).filter(r => r.symbol);
      } catch (e) {
        throw new Error('JSON 파싱 실패: ' + e.message);
      }
    }

    // CSV 처리
    const lines = trimmed.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      throw new Error('CSV는 최소 헤더 + 1행 데이터가 필요합니다');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const symbolIdx = findColumnIndex(headers, ['symbol', '종목', '종목명', '종목코드', 'ticker']);
    const weightIdx = findColumnIndex(headers, ['weight', '비중', '가중치', 'allocation']);

    if (symbolIdx === -1) throw new Error('종목 컬럼을 찾을 수 없습니다 (예: symbol, 종목, ticker)');
    if (weightIdx === -1) throw new Error('비중 컬럼을 찾을 수 없습니다 (예: weight, 비중)');

    return lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim());
      return {
        symbol: cells[symbolIdx],
        weight: parseFloat(cells[weightIdx]),
      };
    }).filter(r => r.symbol && !isNaN(r.weight));
  }

  function findColumnIndex(headers, candidates) {
    for (const cand of candidates) {
      const idx = headers.findIndex(h => h.toLowerCase() === cand.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function handlePreview() {
    setError('');
    setPreview(null);
    try {
      const parsed = parsePastedText(pasteText);
      if (!parsed || parsed.length === 0) {
        setError('파싱된 데이터가 없습니다');
        return;
      }
      setPreview(parsed);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleApply() {
    if (!preview) {
      handlePreview();
      return;
    }
    onApply(preview);
    setPasteText('');
    setPreview(null);
    setError('');
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPasteText(ev.target.result);
      setPreview(null);
      setError('');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function loadSample(type) {
    setPasteText(type === 'csv' ? sampleCSV : sampleJSON);
    setPreview(null);
    setError('');
  }

  const sum = preview ? preview.reduce((acc, h) => acc + h.weight, 0) : 0;
  const willNormalize = preview && Math.abs(sum - 1.0) > 0.01;

  return (
    <div className="if-modal-overlay" onClick={onClose}>
      <div className="if-modal" onClick={(e) => e.stopPropagation()}>
        <div className="if-modal__header">
          <div>
            <div className="if-modal__title-row">
              <div className="if-modal__title">데이터 업로드</div>
              <span className="if-modal__badge">CSV / JSON 지원</span>
            </div>
            <div className="if-modal__sub">
              data-rules.md의 컬럼 매핑 규칙이 자동 적용됩니다
            </div>
          </div>
          <button className="if-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="if-modal__body">
          {/* 파일 업로드 + 샘플 */}
          <div className="if-modal__row">
            <label className="if-btn if-btn--primary">
              파일 선택 (.csv / .json)
              <input
                type="file"
                accept=".csv,.json,.txt"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button className="if-btn" onClick={() => loadSample('csv')}>CSV 샘플 불러오기</button>
            <button className="if-btn" onClick={() => loadSample('json')}>JSON 샘플 불러오기</button>
          </div>

          {/* 텍스트 입력 */}
          <textarea
            className="if-modal__textarea"
            placeholder="여기에 CSV 또는 JSON을 직접 붙여넣어도 됩니다.

예) symbol,weight
삼성전자,0.35
NAVER,0.30
..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />

          {error && <div className="if-modal__error">⚠ {error}</div>}

          {preview && (
            <div className="if-modal__preview">
              <div className="if-modal__preview-head">
                <strong>파싱 결과 미리보기 ({preview.length}종목)</strong>
                <span style={{ fontFamily: 'var(--if-font-mono)', fontSize: 11 }}>
                  합계: {(sum * 100).toFixed(1)}%
                  {willNormalize && (
                    <span style={{ color: 'var(--if-warning)', marginLeft: 8 }}>
                      → 자동 정규화 예정
                    </span>
                  )}
                </span>
              </div>
              <table className="if-modal__table">
                <thead>
                  <tr>
                    <th>종목 (symbol)</th>
                    <th style={{ textAlign: 'right' }}>비중 (weight)</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td>{row.symbol}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--if-font-mono)' }}>
                        {(row.weight * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {willNormalize && (
                <div className="if-modal__note">
                  ℹ data-rules.md 규칙: 합계가 1.0 ± 0.01을 벗어나면 자동 정규화하여 렌더링됩니다.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="if-modal__footer">
          <button className="if-btn" onClick={onClose}>취소</button>
          <button
            className="if-btn if-btn--primary"
            onClick={handleApply}
            disabled={!pasteText.trim()}
          >
            {preview ? '대시보드에 적용' : '미리보기'}
          </button>
        </div>
      </div>
    </div>
  );
}
