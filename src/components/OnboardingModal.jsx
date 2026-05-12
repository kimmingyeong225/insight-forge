import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore.js';

/**
 * 첫 방문 온보딩 모달 (P5 · 톤 보정 3단계)
 *
 * SaaS 환영 톤 → "규칙 기반 분석 엔진" 정체성 톤.
 * 4단계 분석 프로세스(데이터 → 규칙 적용 → 인사이트 생성 → 대시보드)로 설명.
 *
 * localStorage `if.onboarded` 없으면 0.5s 지연 후 페이드인.
 */
const STEPS = [
  {
    no: '01',
    title: '투자 데이터 선택',
    desc: '주식·암호화폐 등 분석할 데이터를 고릅니다',
  },
  {
    no: '02',
    title: '분석 규칙(Skills.md) 적용',
    desc: '5종 규칙 문서가 데이터를 분석합니다 · data → metric → viz → insight → report',
  },
  {
    no: '03',
    title: '인사이트 자동 생성',
    desc: '규칙이 데이터를 평가하여 진단을 도출합니다',
  },
  {
    no: '04',
    title: '규칙 기반 대시보드 렌더링',
    desc: '시나리오에 따라 화면이 재구성됩니다',
  },
];

export default function OnboardingModal() {
  const isOpen = useStore((s) => s.isOnboardingOpen);
  const closeOnboarding = useStore((s) => s.closeOnboarding);
  const isLiveMode = useStore((s) => s.isLiveMode);
  const toggleLiveMode = useStore((s) => s.toggleLiveMode);
  const bundle = useStore((s) => s.bundle);
  const bundleId = useStore((s) => s.bundleId);

  const [visible, setVisible] = useState(false);
  const [neverAgain, setNeverAgain] = useState(true);

  useEffect(() => {
    if (!isOpen) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeOnboarding(neverAgain); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, neverAgain, closeOnboarding]);

  if (!isOpen) return null;

  const handleDummy = () => closeOnboarding(neverAgain);
  const handleLive = () => {
    closeOnboarding(neverAgain);
    if (!isLiveMode) toggleLiveMode();
  };

  // 현재 적용된 번들 + 버전 (metric-rules.md frontmatter에서 읽음)
  const appliedVersion = bundle?.files?.['metric-rules']?.frontmatter?.version || '1.0.0';
  const appliedBundle = bundle?.id || bundleId || 'insight-forge-default';

  return (
    <div
      className={`if-onboarding ${visible ? 'is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="if-onboarding-title"
    >
      <div className="if-onboarding__backdrop" onClick={handleDummy} />

      <div className="if-onboarding__card">
        <button
          type="button"
          className="if-onboarding__close"
          onClick={handleDummy}
          aria-label="온보딩 닫기"
        >×</button>

        <h2 id="if-onboarding-title" className="if-onboarding__title">
          Insight Forge
        </h2>
        <p className="if-onboarding__sub">
          규칙으로 인사이트를 주조하는 투자 분석 엔진
        </p>

        <ol className="if-onboarding__steps">
          {STEPS.map((s) => (
            <li key={s.no} className="if-onboarding__step">
              <div className="if-onboarding__step-num">{s.no}</div>
              <div className="if-onboarding__step-body">
                <div className="if-onboarding__step-title">{s.title}</div>
                <div className="if-onboarding__step-desc">{s.desc}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="if-onboarding__ctas">
          <button
            type="button"
            className="if-onboarding__btn if-onboarding__btn--primary"
            onClick={handleDummy}
            autoFocus
          >
            📊 더미 데이터로 분석 시연
          </button>
          <button
            type="button"
            className="if-onboarding__btn if-onboarding__btn--secondary"
            onClick={handleLive}
          >
            🔍 실시간 데이터로 분석 시작
          </button>
        </div>

        <div className="if-onboarding__footer">
          <label className="if-onboarding__remember">
            <input
              type="checkbox"
              checked={neverAgain}
              onChange={(e) => setNeverAgain(e.target.checked)}
            />
            <span>다시 보지 않기</span>
          </label>
          <div className="if-onboarding__applied">
            현재 적용된 번들: {appliedBundle} v{appliedVersion}
          </div>
        </div>
      </div>
    </div>
  );
}
