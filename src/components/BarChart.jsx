/**
 * 막대 차트 — 종목별 수익률 비교
 * viz-rules.md 양수/음수 색상 분리
 */
export default function BarChart({ data }) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const maxAbs = Math.max(...sorted.map(r => Math.abs(r.value)), 1);

  return (
    <div style={{ paddingTop: 8 }}>
      {sorted.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 56px',
            gap: 8,
            alignItems: 'center',
            marginBottom: 6,
            fontSize: 12,
          }}
        >
          <div
            style={{
              color: 'var(--if-navy)',
              fontSize: 11,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.name}
          </div>
          <div
            style={{
              height: 14,
              background: 'var(--if-cream)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(Math.abs(row.value) / maxAbs) * 100}%`,
                height: '100%',
                background: row.value >= 0 ? 'var(--if-success)' : 'var(--if-danger)',
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div
            style={{
              fontFamily: 'var(--if-font-mono)',
              color: row.value >= 0 ? 'var(--if-success)' : 'var(--if-danger)',
              textAlign: 'right',
              fontSize: 11,
            }}
          >
            {row.value >= 0 ? '+' : ''}
            {row.value.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}
