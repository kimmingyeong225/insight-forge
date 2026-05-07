import { gradeColor } from '../core/vizRouter.js';

/**
 * 게이지 차트 — 0~100 점수 표시 (포트폴리오 건강도 등)
 * viz-rules.md 4.5의 Gauge 스타일
 */
export default function Gauge({ value, label, size = 140 }) {
  const grade = gradeColor(value);
  const radius = size * 0.41;
  const circumference = 2 * Math.PI * radius;
  const dashLength = (value / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${label} ${Math.round(value)}점`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(245,241,232,0.15)"
        strokeWidth="10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={grade.color}
        strokeWidth="10"
        strokeDasharray={`${dashLength} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontFamily="Times New Roman, serif"
        fontSize="36"
        fill="#F5F1E8"
        fontStyle="italic"
      >
        {Math.round(value)}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 24}
        textAnchor="middle"
        fontSize="10"
        fill="rgba(245,241,232,0.6)"
        letterSpacing="0.15em"
      >
        SCORE
      </text>
    </svg>
  );
}
