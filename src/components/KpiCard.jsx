import { evaluateGrade } from '../core/vizRouter.js';

/**
 * KPI 카드 위젯
 * viz-rules.md 4.4 항목의 KpiCard 스타일을 따름
 */
export default function KpiCard({ label, value, format, metricId, isCustom = false, tooltip = null }) {
  const hasValue = value != null && !(typeof value === 'number' && Number.isNaN(value));
  const grade = hasValue ? evaluateGrade(metricId, value) : null;
  const formattedValue = format(value);

  return (
    <div className={`if-kpi ${isCustom ? 'if-kpi--featured' : ''}`}>
      {isCustom && (
        <span className="if-kpi__star" title="Insight Forge 자체 정의 지표">★</span>
      )}
      <div className="if-kpi__label group">
        <span>{label}</span>
        {tooltip && (
          <div className="if-tooltip-container">
            <svg 
              className="if-tooltip-icon-svg" 
              width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
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
      {hasValue && grade?.label && (
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
