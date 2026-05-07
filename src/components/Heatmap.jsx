/**
 * 히트맵 — 상관계수 행렬 시각화
 * viz-rules.md 4.3 Heatmap 스타일 (대각선 강조, 값 표기)
 */
export default function Heatmap({ symbols, matrix }) {
  const cellSize = Math.min(40, 220 / Math.max(symbols.length, 3));

  return (
    <div style={{ display: 'grid', gap: 2, paddingTop: 8 }}>
      {/* 헤더 행 */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <div style={{ width: 60 }} />
        {symbols.map((s, i) => (
          <div
            key={i}
            style={{
              width: cellSize,
              fontSize: 9,
              color: 'var(--if-text-muted)',
              textAlign: 'center',
              transform: 'translateY(-2px)',
            }}
          >
            {s.length > 5 ? s.substring(0, 4) + '..' : s}
          </div>
        ))}
      </div>
      {/* 행렬 */}
      {matrix.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <div
            style={{
              width: 60,
              fontSize: 10,
              color: 'var(--if-text-muted)',
              textAlign: 'right',
              paddingRight: 6,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {symbols[i].length > 8 ? symbols[i].substring(0, 7) + '..' : symbols[i]}
          </div>
          {row.map((v, j) => {
            const intensity = Math.abs(v);
            const isDiagonal = i === j;
            const bgColor = v > 0
              ? `rgba(15, 27, 61, ${intensity})`
              : `rgba(153, 60, 29, ${Math.abs(intensity)})`;
            return (
              <div
                key={j}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: bgColor,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: intensity > 0.5 ? 'white' : '#0F1B3D',
                  fontWeight: 500,
                  border: isDiagonal ? '1.5px solid rgba(186,117,23,0.4)' : 'none',
                }}
                title={`${symbols[i]} ↔ ${symbols[j]}: ${v.toFixed(3)}`}
              >
                {v.toFixed(2)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
