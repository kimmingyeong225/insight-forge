import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore.js';
import { computeAllMetrics } from '../core/metrics.js';
import { evaluateInsights } from '../core/insights.js';
import { getDataset, getDatasetList } from '../core/datasets.js';
import { getScenarios, getScenario } from '../core/scenarios.js';
import { getKpiDefinitions } from '../core/kpiDefinitions.js';
import { gradeColor } from '../core/vizRouter.js';

import KpiCard from '../components/KpiCard.jsx';
import LineChart from '../components/LineChart.jsx';
import DonutChart from '../components/DonutChart.jsx';
import Heatmap from '../components/Heatmap.jsx';
import BarChart from '../components/BarChart.jsx';
import InsightCard from '../components/InsightCard.jsx';
import SkillsInspector from '../components/SkillsInspector.jsx';
import Gauge from '../components/Gauge.jsx';
import DataUploader from '../components/DataUploader.jsx';
import StockSearch from '../components/StockSearch.jsx';
import OnboardingModal from '../components/OnboardingModal.jsx';

import './Dashboard.css';

export default function Dashboard() {
  const {
    bundleId, datasetId, scenarioId, bundle, isLoading,
    userDataset, isUploaderOpen,
    setBundle, setDataset, setScenario, init,
    openUploader, closeUploader, applyUserData, clearUserData,
    isLiveMode, isLiveLoading, liveError, liveHoldings,
    toggleLiveMode, addLiveHolding, removeLiveHolding, applyLiveData,
    isInspectorOpen, toggleInspector,
    isScenarioHintDismissed, dismissScenarioHint,
    isOnboardingOpen, closeOnboarding,
    isLiveInputCollapsed, expandLiveInput, quickStartPortfolio,
  } = useStore();

  const liveTotalWeight = useMemo(
    () => liveHoldings.reduce((acc, h) => acc + h.weight, 0),
    [liveHoldings]
  );
  const isLiveTotal100 = Math.round(liveTotalWeight * 1000) === 1000;

  const insightsRef = useRef(null);
  const [showBasicKpis, setShowBasicKpis] = useState(true);

  const scrollToInsights = () => {
    insightsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => { init(); }, []);

  const isCrypto = bundleId === 'insight-forge-crypto';

  // 데이터셋 — 사용자 업로드가 있으면 그걸 우선
  const rawDataset = useMemo(() => {
    if (userDataset) return userDataset;
    return getDataset(bundleId, datasetId);
  }, [bundleId, datasetId, userDataset]);

  const { holdings, warning } = useMemo(() => {
    const list = Array.isArray(rawDataset.holdings) ? rawDataset.holdings : [];
    const identity = list.map(h => ({
      symbol: h.symbol,
      weight: parseFloat(h.weight) || 0,
      quantity: h.quantity,
      avg_price: h.avg_price,
    }));
    const sum = identity.reduce((acc, h) => acc + h.weight, 0);
    const warn = (identity.length > 0 && Math.abs(sum - 1.0) > 0.01)
      ? `포트폴리오 비중 합계가 ${(sum * 100).toFixed(1)}% 입니다. 100%로 맞춰 다시 시도해주세요.`
      : null;
    return { holdings: identity, warning: warn };
  }, [rawDataset]);

  const computedMetrics = useMemo(() => {
    return computeAllMetrics({
      holdings,
      returnsBySymbol: rawDataset.returnsBySymbol,
      portfolioCloses: rawDataset.portfolioCloses.map(p => p.y),
      periodDays: rawDataset.portfolioCloses.length - 1,
    });
  }, [rawDataset, holdings]);

  const metrics = useMemo(() => {
    let m = { ...computedMetrics };
    if (isCrypto && rawDataset.cryptoExtras) {
      m = { ...m, ...rawDataset.cryptoExtras };
    }
    // 데이터 품질 점수 — 사용자 업로드면 약간 낮게, 기본 데이터셋은 높게
    m.data_quality_score = rawDataset.isUserData ? 88 : 96;
    return m;
  }, [computedMetrics, rawDataset, isCrypto]);

  const scenario = useMemo(() => getScenario(bundleId, scenarioId), [bundleId, scenarioId]);
  const allKpiDefs = useMemo(() => getKpiDefinitions(bundleId), [bundleId]);
  const visibleKpis = useMemo(() => {
    if (!scenario.kpis) return allKpiDefs;
    return allKpiDefs.filter(d => scenario.kpis.includes(d.id));
  }, [allKpiDefs, scenario]);

  const insights = useMemo(
    () => evaluateInsights(metrics, holdings, bundleId, scenario.insightFilter),
    [metrics, holdings, bundleId, scenario]
  );

  const heroMetric = isCrypto ? 'volatility_adjusted_risk_score' : 'health_score';
  const heroValue = metrics[heroMetric] ?? 50;
  const heroGrade = gradeColor(heroValue);
  const heroLabel = isCrypto ? '변동성 조정 위험 점수' : '포트폴리오 건강도';

  // 5구간 점수 라벨 + 색상 매핑 (vizRouter.gradeColor와 의미적으로 정렬)
  const heroBand = useMemo(() => {
    if (heroValue >= 80) return { label: '매우 우수', color: '#10B981', dot: '🟢' };
    if (heroValue >= 60) return { label: '양호',     color: '#34D399', dot: '🟢' };
    if (heroValue >= 40) return { label: '주의 필요', color: '#F59E0B', dot: '🟡' };
    if (heroValue >= 20) return { label: '위험',     color: '#F97316', dot: '🟠' };
    return                       { label: '심각',     color: '#EF4444', dot: '🔴' };
  }, [heroValue]);

  // 액션 지향 메시지: 인사이트 심각도/개수 기반
  const heroMessage = useMemo(() => {
    const critical = insights.filter(i => i.severity === 'critical').length;
    const warning  = insights.filter(i => i.severity === 'warning').length;
    if (critical > 0) return `즉시 점검이 필요한 항목 ${critical}건`;
    if (warning > 0)  return `개선 여지가 있는 영역 ${warning}건`;
    return '안정적인 포트폴리오 상태';
  }, [insights]);

  const lineData = useMemo(() => {
    const closes = rawDataset.portfolioCloses;
    const start = closes[0].y;
    return closes
      .filter((_, i) => i % 7 === 0)
      .map((p, idx) => ({
        label: p.date ? p.date.slice(5) : 'D+' + (idx * 7),
        value: parseFloat((((p.y / start) - 1) * 100).toFixed(2)),
      }));
  }, [rawDataset]);

  const datasetList = useMemo(() => getDatasetList(bundleId), [bundleId]);
  const scenarios = useMemo(() => getScenarios(bundleId), [bundleId]);

  const volatilityTooltip = useMemo(() => {
    const closes = rawDataset.portfolioCloses;
    if (!closes || closes.length === 0) return null;
    const start = closes[0].y;
    const end = closes[closes.length - 1].y;
    const fmtStart = Math.round(start).toLocaleString();
    const fmtEnd = Math.round(end).toLocaleString();

    return (
      <>
        <div style={{ whiteSpace: 'nowrap' }}>
          최근 1년 가격 변동: ₩{fmtStart} → ₩{fmtEnd}
        </div>
        <div style={{ marginTop: '4px', opacity: 0.8, fontSize: '10px' }}>
          * 급격한 주가 변동(상승/하락)은 변동성 수치를 높게 만듭니다.
        </div>
      </>
    );
  }, [rawDataset]);

  // 시나리오별 섹션 표시 여부 (report-rules.md)
  const showTrend = !scenario.executiveBrief && !scenario.hideSections?.includes('trend_hidden');
  const showComposition = !scenario.executiveBrief && !scenario.hideSections?.includes('composition_hidden');
  const trendCollapsed = scenario.hideSections?.includes('trend_collapsed');
  const compositionCollapsed = scenario.hideSections?.includes('composition_collapsed');

  return (
    <div className="if-app">
      <h2 className="sr-only">
        Insight Forge — Skills.md 기반 범용 투자 분석 대시보드.
      </h2>

      {/* HEADER */}
      <header className="if-header">
        <div className="if-header__brand">
          <div className="if-brand-mark">Insight Forge</div>
          <div className="if-brand-tag">규칙으로 인사이트를 주조하다</div>
        </div>
        <div className="if-header__controls">
          <ControlField label="분석 도메인" tip="투자 도메인을 선택하면 분석 규칙이 전환됩니다">
            <select
              className="if-select"
              value={bundleId}
              onChange={(e) => setBundle(e.target.value)}
              aria-label="Skills 번들 선택"
            >
              <option value="insight-forge-default">📊 주식·금융기업</option>
              <option value="insight-forge-crypto">₿ 암호화폐</option>
            </select>
          </ControlField>

          <ControlField
            label="데이터 출처"
            tip={isLiveMode ? '더미 데이터로 돌아갑니다' : '실시간 시장 데이터로 분석을 전환합니다'}
          >
            <button
              className={`if-mode-btn ${isLiveMode ? 'is-live' : ''}`}
              onClick={toggleLiveMode}
              aria-pressed={isLiveMode}
            >
              {isLiveMode ? (
                <>
                  <span className="if-live-dot" aria-hidden="true" />
                  <span>LIVE</span>
                </>
              ) : (
                <>⬜ 더미 데이터</>
              )}
            </button>
          </ControlField>

          {!isLiveMode && (
            <ControlField label="포트폴리오" tip="분석할 데이터셋을 선택합니다">
              <select
                className="if-select"
                value={userDataset ? '__user__' : datasetId}
                onChange={(e) => {
                  if (e.target.value !== '__user__') {
                    setDataset(e.target.value);
                  }
                }}
                aria-label="데이터셋 선택"
              >
                {datasetList.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                {userDataset && <option value="__user__">📤 {userDataset.name}</option>}
              </select>
            </ControlField>
          )}

          <ControlField label="규칙 보기" tip="이 화면을 생성한 .md 규칙 보기">
            <button
              className={`if-inspector-toggle ${isInspectorOpen ? 'is-open' : ''}`}
              onClick={toggleInspector}
              aria-pressed={isInspectorOpen}
              aria-label="Skills.md Inspector 토글"
            >
              <span className="if-inspector-toggle__icon">📋</span>
              <span className="if-inspector-toggle__label">Skills.md</span>
            </button>
          </ControlField>
        </div>
      </header>

      {/* 실시간 모드 패널 */}
      {isLiveMode && (
        <div className="if-live-panel">
          {isLiveInputCollapsed ? (
            // 접힌 상태 — 결과 영역 강조 + "종목 변경" 칩
            <div className="if-live-collapsed">
              <div className="if-live-collapsed__info">
                <span className="if-live-collapsed__icon">📊</span>
                <span>
                  실시간 분석 중 · {liveHoldings.length}종목
                  ({liveHoldings.map(h => h.symbol).join(', ')})
                </span>
              </div>
              <button
                type="button"
                className="if-live-collapsed__edit"
                onClick={expandLiveInput}
                title="종목 구성 다시 편집"
              >
                🔍 종목 변경하기
              </button>
            </div>
          ) : (
            <>
              {/* 진입 가이드 1단락 (a) */}
              <div className="if-live-intro">
                <div className="if-live-intro__title">📊 분석할 종목을 추가하세요</div>
                <div className="if-live-intro__sub">
                  여러 종목을 추가하면 포트폴리오 분석이 가능합니다.
                  비중은 100%가 아니어도 자동으로 조정됩니다.
                </div>
              </div>

              {/* Search Area */}
              <div className="if-live-panel__search-section">
                <StockSearch onAdd={addLiveHolding} domain={isCrypto ? 'crypto' : 'stock'} />
              </div>

              <div className="if-live-panel__main">
                {liveHoldings.length === 0 ? (
                  <div className="if-live-empty">
                    <div className="if-live-empty__icon">🚀</div>
                    <div className="if-live-empty__text">어떤 종목을 분석해볼까요?</div>
                    <div className="if-live-empty__sub">
                      위 검색창에 입력하거나 아래 추천 태그를 클릭하세요
                    </div>
                    <button
                      type="button"
                      className="if-live-empty__quickstart"
                      onClick={quickStartPortfolio}
                      title="삼성전자 60% + SK하이닉스 40%로 즉시 시작"
                    >
                      📊 추천 포트폴리오로 시작
                    </button>
                  </div>
                ) : (
                  <div className="if-live-list">
                    {liveHoldings.map(h => (
                      <div key={h.symbol} className="if-live-card">
                        <div className="if-live-card__info">
                          <span className="if-live-card__sym">{h.symbol}</span>
                          <span className="if-live-card__price">{h.price || '시세 확인 중...'}</span>
                        </div>

                        <div className="if-live-card__control">
                          <div className="if-live-card__input-label">목표 비중</div>
                          <div className="if-live-card__input-wrap">
                            <input
                              type="number"
                              className="if-live-card__input"
                              value={h.weight === 0 ? '' : (h.weight * 100).toFixed(0)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const { updateLiveHoldingWeight } = useStore.getState();
                                updateLiveHoldingWeight(h.symbol, val / 100);
                              }}
                              placeholder="0"
                              min="0"
                              max="100"
                            />
                            <span className="if-live-card__unit">%</span>
                          </div>
                          <button
                            className="if-live-card__remove"
                            onClick={() => removeLiveHolding(h.symbol)}
                            title="삭제"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 비중 합계 안내 (비중이 0일 때만 크게 표시) */}
                {liveHoldings.length > 0 && liveTotalWeight === 0 && (
                  <div className="if-live-guide">
                    <div className="if-live-guide__icon">💡</div>
                    <div className="if-live-guide__text">추가된 종목의 비중을 설정해 보세요</div>
                    <div className="if-live-guide__sub">입력하신 비율에 따라 자동으로 포트폴리오가 구성됩니다</div>
                  </div>
                )}

                <div className="if-live-panel__footer">
                  <div className="if-live-total">
                    <span className="if-live-total__label">비중 합계:</span>
                    <span className={`if-live-total__value ${isLiveTotal100 ? 'is-valid' : (liveTotalWeight > 0 ? 'is-warning' : '')}`}>
                      {isLiveTotal100 ? '✅ ' : (liveTotalWeight > 0 ? '⚠️ ' : '')}{(liveTotalWeight * 100).toFixed(1)}%
                    </span>
                    {!isLiveTotal100 && liveTotalWeight > 0 && (
                      <span className="if-live-total__info if-live-total__info--warn">
                        비중 합계를 100%로 조정해주세요
                      </span>
                    )}
                    {isLiveTotal100 && (
                      <span className="if-live-total__info if-live-total__info--ok">
                        ✓ 분석 준비 완료
                      </span>
                    )}
                  </div>
                  <button
                    className={`if-live-panel__run ${isLiveTotal100 ? 'is-pulse' : ''}`}
                    onClick={applyLiveData}
                    disabled={liveHoldings.length === 0 || isLiveLoading || !isLiveTotal100}
                  >
                    {isLiveLoading ? '⏳ 데이터 수집 및 분석 중...' : '🔥 포트폴리오 분석 시작'}
                  </button>
                </div>
              </div>
            </>
          )}

          {liveError && (
            <div className="if-live-error">
              ⚠ {liveError}
              <button className="if-live-error__retry" onClick={applyLiveData}>재시도</button>
            </div>
          )}
        </div>
      )}

      {/* BODY */}
      <div className="if-body">
        <main className="if-main">
          {/* 시나리오 영역 */}
          {!isScenarioHintDismissed && (
            <div className="if-scenario-hint" role="status">
              <span className="if-scenario-hint__icon">💡</span>
              <span className="if-scenario-hint__text">
                현재 샘플 포트폴리오로 분석 중입니다. 내 데이터를 업로드하면 맞춤 인사이트를 생성할 수 있습니다.
              </span>
              <button
                type="button"
                className="if-scenario-hint__close"
                onClick={dismissScenarioHint}
                aria-label="힌트 닫기"
                title="다시 보지 않기"
              >×</button>
            </div>
          )}
          <div className="if-scenario-bar" role="tablist" aria-label="분석 시나리오">
            {scenarios.map(s => (
              <button
                key={s.id}
                role="tab"
                aria-selected={s.id === scenarioId}
                className={`if-scenario-btn ${s.id === scenarioId ? 'is-active' : ''}`}
                onClick={() => setScenario(s.id)}
                title={s.description}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* 시나리오 설명 + 사용자 데이터 표시 */}
          <div className="if-scenario-desc" key={scenarioId}>
            <span className="if-scenario-desc__icon">⚙</span>
            <span className="if-scenario-desc__text">
              <strong>{scenario.label}</strong> — {scenario.description}
              {scenario.insightFilter && (
                <span className="if-scenario-desc__filter">
                  · 인사이트 필터: {scenario.insightFilter.join(', ')}
                </span>
              )}
            </span>
            {userDataset && (
              <button className="if-clear-user" onClick={clearUserData} title="사용자 데이터 지우기">
                업로드 데이터 지우기 ×
              </button>
            )}
          </div>

          {warning && (
            <div className="if-warning-banner">
              ⚠ {warning}
              <span className="if-warning-rule">data-rules.md · weight 정규화 규칙</span>
            </div>
          )}

          {/* HERO */}
          <section className="if-hero">
            <Gauge value={heroValue} label={heroLabel} />
            <div className="if-hero__body">
              <div className="if-hero__label">
                {heroLabel} — <span style={{ color: heroBand.color }}>
                  {Math.round(heroValue)}점 {heroBand.label}
                </span>
              </div>
              <div className="if-hero__identity">Skills 기반 규칙 엔진으로 생성된 포트폴리오 분석 결과</div>
              <div className="if-hero__message">{heroMessage}</div>
              <div className="if-hero__meta">
                {bundle?.id || bundleId} · {rawDataset.name} · 시나리오: {scenario.label}
                · 데이터 품질 {metrics.data_quality_score}점
              </div>
              {/* 실시간 데이터 출처 뱃지 */}
              {rawDataset.sources && (
                <div className="if-source-badges">
                  {rawDataset.sources.map(s => (
                    <span key={s.symbol} className={`if-source-badge if-source-badge--${s.source}`}>
                      {s.symbol} · {s.source === 'live' ? '실시간' : s.source === 'cache' ? '캐시' : '시뮬'}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {insights.length > 0 && (
              <div className="if-hero__cta">
                <button
                  type="button"
                  className="if-hero__cta-btn"
                  onClick={scrollToInsights}
                  title="실행 가능 인사이트 영역으로 이동"
                >
                  ➡️ 인사이트 보기
                </button>
                <div className="if-hero__cta-meta">{insights.length}건 트리거됨</div>
              </div>
            )}
          </section>

          {/* Hero 아래 업로드 CTA — 더미 데이터 모드 (LIVE/업로드 적용 둘 다 아님) 일 때만 노출 */}
          {!isLiveMode && !userDataset && (
            <div className="if-cta-upload" role="region" aria-label="포트폴리오 업로드 안내">
              <p className="if-cta-upload__hint">
                샘플 데이터로 분석 중입니다.<br/>
                보유 종목 파일을 업로드하면 맞춤형 인사이트를 생성할 수 있습니다.
              </p>
              <button
                type="button"
                className="if-cta-upload__btn"
                onClick={openUploader}
              >
                📁 내 포트폴리오 업로드
              </button>
            </div>
          )}

          {/* KPI — 자체 지표 (강조) + 기본 지표 (보조) 2단 구조 */}
          {(() => {
            const customKpis = visibleKpis.filter(d => d.isCustom);
            const basicKpis  = visibleKpis.filter(d => !d.isCustom);
            return (
              <>
                {customKpis.length > 0 && (
                  <>
                    <SectionLabel
                      title="⭐ Insight Forge 자체 지표"
                      rule={`metric-rules.md (${customKpis.length}종 차별점)`}
                      accent="gold"
                    />
                    <div className="if-kpi-grid if-kpi-grid--featured">
                      {customKpis.map(def => (
                        <KpiCard
                          key={def.id}
                          label={def.label}
                          value={metrics[def.id]}
                          format={def.format}
                          metricId={def.id}
                          isCustom={def.isCustom}
                          tooltip={def.id === 'volatility' ? volatilityTooltip : null}
                        />
                      ))}
                    </div>
                  </>
                )}

                {basicKpis.length > 0 && (
                  <>
                    <SectionLabel
                      title="📊 기본 지표"
                      rule={`viz-rules.md (${basicKpis.length}개 KPI)`}
                      collapsible
                      collapsed={!showBasicKpis}
                      onToggle={() => setShowBasicKpis(v => !v)}
                    />
                    {showBasicKpis && (
                      <div className="if-kpi-grid if-kpi-grid--basic">
                        {basicKpis.map(def => (
                          <KpiCard
                            key={def.id}
                            label={def.label}
                            value={metrics[def.id]}
                            format={def.format}
                            metricId={def.id}
                            isCustom={def.isCustom}
                            tooltip={def.id === 'volatility' ? volatilityTooltip : null}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            );
          })()}

          {/* 추세 분석 — 시나리오에 따라 표시/숨김/축소 */}
          {showTrend && !trendCollapsed && (
            <>
              <SectionLabel title="추세 분석" rule="report-rules.md · trend_analysis" />
              <div className="if-row if-row--2-1">
                <Card title="누적 수익률 추이" meta={`최근 1년 · 누적 ${(metrics.cumulative_return * 100).toFixed(1)}%`}>
                  <LineChart data={lineData} color="#0F1B3D" />
                </Card>
                <Card title="자산 비중">
                  <DonutChart holdings={holdings} isCrypto={isCrypto} />
                </Card>
              </div>
            </>
          )}
          {trendCollapsed && (
            <Card title="추세 분석 (축소 표시)" meta="시나리오 설정에 따라 축소됨">
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', fontSize: 13, color: 'var(--if-text-muted)' }}>
                <span>누적 수익률: <strong style={{ color: 'var(--if-navy)' }}>{(metrics.cumulative_return * 100).toFixed(1)}%</strong></span>
                <span>변동성: <strong style={{ color: 'var(--if-navy)' }}>{(metrics.volatility * 100).toFixed(1)}%</strong></span>
                <span>모멘텀: <strong style={{ color: 'var(--if-navy)' }}>{metrics.momentum_strength.toFixed(1)}pt</strong></span>
              </div>
            </Card>
          )}

          {/* 구성 분석 */}
          {showComposition && !compositionCollapsed && (
            <>
              <SectionLabel title="구성 분석" rule="report-rules.md · composition_analysis" />
              <div className="if-row if-row--1-1">
                <Card title="종목 간 상관계수">
                  <Heatmap symbols={metrics.correlation_symbols} matrix={metrics.correlation_matrix} />
                </Card>
                <Card title="종목별 수익률">
                  <BarChart data={rawDataset.symbolReturns} />
                </Card>
              </div>
            </>
          )}
          {compositionCollapsed && (
            <Card title="구성 분석 (축소 표시)" meta="시나리오 설정에 따라 축소됨">
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--if-text-muted)' }}>
                <span>분산점수: <strong>{metrics.diversification_score}점</strong></span>
                <span>집중도(HHI): <strong>{metrics.concentration_score}</strong></span>
                <span>평균 상관: <strong>{metrics.mean_correlation.toFixed(2)}</strong></span>
              </div>
            </Card>
          )}

          {/* 인사이트 */}
          <div ref={insightsRef} id="insights-anchor" />
          <SectionLabel
            title="실행 가능 인사이트"
            rule={`insight-rules.md · ${insights.length}건 트리거${scenario.insightFilter ? ' (필터 적용)' : ''}`}
          />
          <div className="if-insights">
            {insights.length === 0 ? (
              <div className="if-empty">
                {scenario.insightFilter
                  ? `'${scenario.insightFilter.join(', ')}' 카테고리에서 트리거된 인사이트가 없습니다.`
                  : '현재 트리거된 인사이트가 없습니다.'}
              </div>
            ) : (
              insights.map(ins => <InsightCard key={ins.id} insight={ins} />)
            )}
          </div>
        </main>

        <SkillsInspector bundle={bundle} />
      </div>

      <footer className="if-footer">
        <div className="if-pipeline">
          <span className="if-pipeline__dot" />
          <span>pipeline: data-rules → metric-rules → viz-rules → insight-rules → report-rules</span>
        </div>
        <div>{bundleId} v{bundle?.files?.['metric-rules']?.frontmatter?.version || '1.0.0'}</div>
      </footer>

      <DataUploader
        open={isUploaderOpen}
        onClose={closeUploader}
        onApply={applyUserData}
      />

      <OnboardingModal />
    </div>
  );
}

function ControlField({ label, tip, children }) {
  return (
    <div className="if-control-field" title={tip}>
      <div className="if-control-field__label">{label}</div>
      {children}
    </div>
  );
}

function SectionLabel({ title, rule, accent, collapsible, collapsed, onToggle }) {
  return (
    <div className={`if-section-label ${accent ? `if-section-label--${accent}` : ''}`}>
      <span className="if-section-label__title">{title}</span>
      <span className="if-section-label__rule">⚙ {rule}</span>
      {collapsible && (
        <button
          type="button"
          className="if-section-label__toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
        >
          {collapsed ? '펼치기 ▾' : '접기 ▴'}
        </button>
      )}
    </div>
  );
}

function Card({ title, meta, children }) {
  return (
    <div className="if-card">
      <div className="if-card__title">
        <span>{title}</span>
        {meta && <span className="if-card__meta">{meta}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}
