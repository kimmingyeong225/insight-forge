import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getColorForSymbol } from '../core/vizRouter.js';

/**
 * 도넛 차트 — 자산 비중 표시
 * viz-rules.md 4.2 DonutChart 스타일 (inner_radius_ratio: 0.6, padding_angle: 2)
 */
export default function DonutChart({ holdings, isCrypto = false }) {
  const data = holdings.map((h, i) => ({
    name: h.symbol,
    value: h.weight * 100,
    color: getColorForSymbol(h.symbol, i, isCrypto),
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: 130, height: 130, flexShrink: 0 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={62}
              paddingAngle={2}
              stroke="#F5F1E8"
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '1px solid rgba(15, 27, 61, 0.15)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#0F1B3D',
                padding: '6px 10px',
                boxShadow: '0 2px 8px rgba(15, 27, 61, 0.12)',
              }}
              labelStyle={{ color: '#0F1B3D', fontWeight: 600 }}
              itemStyle={{ color: '#0F1B3D' }}
              formatter={(v) => [`${v.toFixed(1)}%`, '비중']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, fontSize: '12px' }}>
        {data.map((d) => (
          <div
            key={d.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '5px',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: d.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--if-navy)', flex: 1 }}>{d.name}</span>
            <span style={{ color: 'var(--if-text-muted)', fontFamily: 'var(--if-font-mono)' }}>
              {d.value.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
