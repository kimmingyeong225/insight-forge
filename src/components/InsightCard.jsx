/**
 * 인사이트 카드 — 자연어 진단 메시지 표시
 * insight-rules.md의 트리거 결과를 시각화
 */
export default function InsightCard({ insight }) {
  return (
    <div className={`if-insight if-insight--${insight.severity}`}>
      <div className="if-insight__head">
        <span className={`if-insight__badge if-insight__badge--${insight.severity}`}>
          {insight.severity}
        </span>
        <span className="if-insight__priority">priority {insight.priority}</span>
      </div>
      <div className="if-insight__msg">{insight.message}</div>
      {insight.action && (
        <div className="if-insight__action">{insight.action}</div>
      )}
      <div className="if-insight__rule">
        ⚙ {insight.id} · {insight.rule}
      </div>
    </div>
  );
}
