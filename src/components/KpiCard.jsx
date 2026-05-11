import { evaluateGrade } from '../core/vizRouter.js';

/**
 * KPI 카드 위젯
 * viz-rules.md 4.4 항목의 KpiCard 스타일을 따름
 */
export default function KpiCard({ label, value, format, metricId, isCustom = false, tooltip = null }) {
  const grade = evaluateGrade(metricId, value);
  const formattedValue = format(value);

  return (
    <div className={`if-kpi ${isCustom ? 'if-kpi--featured' : ''}`}>
      {isCustom && (
        <span className="if-kpi__star" title="Insight Forge 자체 정의 지표">★</span>
      )}
      <div className="if-kpi__rule">metric.{metricId}</div>
      <div className="if-kpi__label group">
        <span>{label}</span>
        {tooltip && (
          <div className="if-tooltip-container">
            <svg 
              className="if-tooltip-icon-svg" 
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <div className="if-tooltip-bubble">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="if-kpi__value">
        {typeof value === 'number' || typeof value === 'string' 
          ? String(formattedValue) 
          : '—'}
      </div>
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
