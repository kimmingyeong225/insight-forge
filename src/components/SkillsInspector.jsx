import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore.js';

/**
 * Skills.md Inspector 패널 — 토글 가능 우측 슬라이드인
 *
 * 우리 시스템의 핵심 차별화 위젯.
 * 현재 적용 중인 Skills.md 번들의 원문을 그대로 표시하여
 * 기획서 1.3의 "투명성" 가치를 직접 구현한다.
 *
 * 기본 닫힘 상태로 시작해 첫 방문자의 인지 부담을 줄이고,
 * 헤더 [📋 Skills.md] 버튼으로 열고 닫는다.
 */
export default function SkillsInspector({ bundle }) {
  const [activeTab, setActiveTab] = useState('metric-rules');
  const isOpen = useStore((s) => s.isInspectorOpen);
  const closeInspector = useStore((s) => s.closeInspector);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeInspector(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeInspector]);

  const tabs = ['data-rules', 'metric-rules', 'viz-rules', 'insight-rules', 'report-rules'];
  const activeFile = bundle?.files?.[activeTab];
  const rawText = activeFile?.rawText || '(파일이 로드되지 않았습니다)';

  // 간이 syntax highlight (헤딩·불릿 강조)
  const highlighted = rawText
    .split('\n')
    .map((line, i) => {
      const headingMatch = line.match(/^(#+)\s+(.*)$/);
      if (headingMatch) {
        return (
          <span key={i} style={{ color: '#F0997B', fontWeight: 500 }}>
            {line}{'\n'}
          </span>
        );
      }
      if (line.trim() === '---') {
        return <span key={i} style={{ color: '#888' }}>{line}{'\n'}</span>;
      }
      if (/^\s*-\s+/.test(line)) {
        return <span key={i} style={{ color: '#97C459' }}>{line}{'\n'}</span>;
      }
      if (/^\s*\|/.test(line)) {
        return <span key={i} style={{ color: '#FAC775' }}>{line}{'\n'}</span>;
      }
      return <span key={i}>{line}{'\n'}</span>;
    });

  return (
    <>
      {/* 모바일 오버레이 (열림 상태일 때만) */}
      <div
        className={`if-inspector-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={closeInspector}
        aria-hidden="true"
      />

      <aside
        className={`if-inspector ${isOpen ? 'is-open' : ''}`}
        aria-hidden={!isOpen}
        aria-label="Skills.md Inspector"
      >
        <div className="if-inspector__header">
          <div>
            <div className="if-inspector__title">Skills.md Inspector</div>
            <div className="if-inspector__sub">applied · {bundle?.id || '—'}</div>
          </div>
          <button
            className="if-inspector__close"
            onClick={closeInspector}
            title="닫기 (ESC)"
            aria-label="Inspector 닫기"
          >
            ×
          </button>
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
    </>
  );
}
