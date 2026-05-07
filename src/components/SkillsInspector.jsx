import { useState } from 'react';

/**
 * Skills.md Inspector 패널
 * 
 * 우리 시스템의 핵심 차별화 위젯.
 * 현재 적용 중인 Skills.md 번들의 원문을 그대로 표시하여
 * 기획서 1.3의 "투명성" 가치를 직접 구현한다.
 */
export default function SkillsInspector({ bundle }) {
  const [activeTab, setActiveTab] = useState('metric-rules');

  const tabs = ['data-rules', 'metric-rules', 'viz-rules', 'insight-rules', 'report-rules'];
  const activeFile = bundle?.files?.[activeTab];
  const rawText = activeFile?.rawText || '(파일이 로드되지 않았습니다)';

  // 간이 syntax highlight (헤딩·불릿 강조)
  const highlighted = rawText
    .split('\n')
    .map((line, i) => {
      // 헤딩
      const headingMatch = line.match(/^(#+)\s+(.*)$/);
      if (headingMatch) {
        return (
          <span key={i} style={{ color: '#F0997B', fontWeight: 500 }}>
            {line}
            {'\n'}
          </span>
        );
      }
      // frontmatter 구분선
      if (line.trim() === '---') {
        return (
          <span key={i} style={{ color: '#888' }}>
            {line}
            {'\n'}
          </span>
        );
      }
      // 불릿
      if (/^\s*-\s+/.test(line)) {
        return (
          <span key={i} style={{ color: '#97C459' }}>
            {line}
            {'\n'}
          </span>
        );
      }
      // 표 구분선
      if (/^\s*\|/.test(line)) {
        return (
          <span key={i} style={{ color: '#FAC775' }}>
            {line}
            {'\n'}
          </span>
        );
      }
      return (
        <span key={i}>
          {line}
          {'\n'}
        </span>
      );
    });

  return (
    <aside className="if-inspector">
      <div className="if-inspector__title">Skills.md Inspector</div>
      <div className="if-inspector__sub">
        applied · {bundle?.id || '—'}
      </div>

      <div className="if-inspector__tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={`if-inspector__tab ${t === activeTab ? 'is-active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <pre className="if-inspector__content">{highlighted}</pre>
    </aside>
  );
}
