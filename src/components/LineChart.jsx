import { LineChart as RLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid } from 'recharts';

/**
 * 라인 차트 (Area 모드 포함)
 * viz-rules.md 4.1 LineChart 스타일
 */
export default function LineChart({ data, color = '#0F1B3D', fillColor = 'rgba(186, 117, 23, 0.08)' }) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ifLineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.20} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9A9A9A' }}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9A9A9A' }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0F1B3D',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#F5F1E8',
              padding: '8px 10px',
            }}
            labelStyle={{ color: 'rgba(245,241,232,0.6)', marginBottom: '4px' }}
            formatter={(value) => [`${value}%`, '누적 수익률']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#ifLineGrad)"
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
