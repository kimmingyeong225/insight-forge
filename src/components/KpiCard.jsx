import { evaluateGrade } from '../core/vizRouter.js';

/**
 * KPI 카드 위젯
 * viz-rules.md 4.4 항목의 KpiCard 스타일을 따름
 */
export default function KpiCard({ label, value, format, metricId, isCustom = false }) {
  const grade = evaluateGrade(metricId, value);
  const formattedValue = format(value);

  return (
    <div className={`if-kpi ${isCustom ? 'if-kpi--featured' : ''}`}>
      {isCustom && (
        <span className="if-kpi__star" title="Insight Forge 자체 정의 지표">★</span>
      )}
      <div className="if-kpi__rule">metric.{metricId}</div>
      <div className="if-kpi__label">{label}</div>
      <div className="if-kpi__value">{formattedValue}</div>
      {grade.label && (
        <span
          className="if-kpi__grade"
          style={{ color: grade.color, background: grade.bg }}
        >
          {grade.label}
        </span>
      )}
    </div>
  );
}
