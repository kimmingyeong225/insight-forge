import { getStructuredInsight } from './insightMessages.js';

/**
 * 인사이트 카드 — 자연어 진단 메시지 표시 (3단 구조)
 *
 * 정보 위계:
 *   - lead: 수치 포함 사실 진술 (강조 톤)
 *   - 원인 / 영향 / 권장: 3단 라벨 + 본문 (작은 uppercase 태그)
 *   - 권장은 골드 강조 (action_hint 역할)
 *
 * Backward-compat:
 *   - 매핑/파싱 결과 없으면 기존 방식(message + action) 그대로 표시
 *   - core.insight.action(action_hint)은 매핑의 action보다 우선 (실제 데이터값 포함 가능)
 */
const SEVERITY_LABEL = {
  critical: '즉시 점검',
  warning:  '주의',
  info:     '정보',
  success:  '안정',
};

export default function InsightCard({ insight }) {
  const sevLabel = SEVERITY_LABEL[insight.severity] || insight.severity;
  const structured = getStructuredInsight(insight);

  return (
    <div className={`if-insight if-insight--${insight.severity}`}>
      <div className="if-insight__head">
        <span className={`if-insight__badge if-insight__badge--${insight.severity}`}>
          {sevLabel}
        </span>
        <span
          className="if-insight__priority"
          title={`insight-rules.md 우선순위 ${insight.priority}`}
        >
          P{insight.priority}
        </span>
      </div>

      {structured ? (
        <>
          <div className="if-insight__lead">{structured.lead}</div>
          {structured.cause && (
            <div className="if-insight-section">
              <span className="if-insight-section__label if-insight-section__label--cause">
                원인
              </span>
              <span className="if-insight-section__body">{structured.cause}</span>
            </div>
          )}
          {structured.impact && (
            <div className="if-insight-section">
              <span className="if-insight-section__label if-insight-section__label--impact">
                영향
              </span>
              <span className="if-insight-section__body">{structured.impact}</span>
            </div>
          )}
          {structured.action && (
            <div className="if-insight-section if-insight-section--action">
              <span className="if-insight-section__label if-insight-section__label--action">
                권장
              </span>
              <span className="if-insight-section__body">{structured.action}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="if-insight__msg">{insight.message}</div>
          {insight.action && (
            <div className="if-insight__action">{insight.action}</div>
          )}
        </>
      )}

      <div className="if-insight__source" title={`${insight.id} · ${insight.rule}`}>
        📋 insight-rules.md
      </div>
    </div>
  );
}
