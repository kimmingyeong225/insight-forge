import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore.js';
import { computeAllMetrics } from '../core/metrics.js';
import { evaluateInsights } from '../core/insights.js';
import { getDataset, getDatasetList } from '../core/datasets.js';
import { getScenarios, getScenario } from '../core/scenarios.js';
import { getKpiDefinitions } from '../core/kpiDefinitions.js';
import { gradeColor } from '../core/vizRouter.js';
import { normalizePortfolio } from '../core/normalizer.js';

import KpiCard from '../components/KpiCard.jsx';
import LineChart from '../components/LineChart.jsx';
import DonutChart from '../components/DonutChart.jsx';
import Heatmap from '../components/Heatmap.jsx';
import BarChart from '../components/BarChart.jsx';
import InsightCard from '../components/InsightCard.jsx';
import SkillsInspector from '../components/SkillsInspector.jsx';
import Gauge from '../components/Gauge.jsx';
import DataUploader from '../components/DataUploader.jsx';

import './Dashboard.css';

export default function Dashboard() {
  const {
    bundleId, datasetId, scenarioId, bundle, isLoading,
    userDataset, isUploaderOpen,
    setBundle, setDataset, setScenario, init,
    openUploader, closeUploader, applyUserData, clearUserData,
  } = useStore();

  useEffect(() => { init(); }, []);

  const isCrypto = bundleId === 'insight-forge-crypto';

  // 데이터셋 — 사용자 업로드가 있으면 그걸 우선
  const rawDataset = useMemo(() => {
    if (userDataset) return userDataset;
    return getDataset(bundleId, datasetId);
  }, [bundleId, datasetId, userDataset]);

  const { holdings, warning } = useMemo(
    () => normalizePortfolio(rawDataset.holdings),
    [rawDataset]
  );

  const computedMetrics = useMemo(() => {
    return computeAllMetrics({
      holdings,
      returnsBySymbol: rawDataset.returnsBySymbol,
      portfolioCloses: rawDataset.portfolioCloses.map(p => p.y),
      periodDays: 252,
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
  const heroMessage =
    heroValue >= 80 ? '균형 잡힌 포트폴리오입니다' :
    heroValue >= 60 ? '양호하지만 일부 점검이 필요합니다' :
    heroValue >= 40 ? '주의가 필요한 영역이 있습니다' :
                      '즉시 조치가 필요한 항목이 있습니다';

  const lineData = useMemo(() => {
    const closes = rawDataset.portfolioCloses;
    const start = closes[0].y;
    return closes
      .filter((_, i) => i % 7 === 0)
      .map(p => ({
        label: 'D+' + p.x,
        value: parseFloat((((p.y / start) - 1) * 100).toFixed(2)),
      }));
  }, [rawDataset]);

  const datasetList = useMemo(() => getDatasetList(bundleId), [bundleId]);
  const scenarios = useMemo(() => getScenarios(bundleId), [bundleId]);

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
          <select
            className="if-select"
            value={bundleId}
            onChange={(e) => setBundle(e.target.value)}
            aria-label="Skills 번들 선택"
          >
            <option value="insight-forge-default">📊 insight-forge-default · 주식·금융기업</option>
            <option value="insight-forge-crypto">₿ insight-forge-crypto · 암호화폐</option>
          </select>
          <select
            className="if-select"
            value={userDataset ? '__user__' : datasetId}
            onChange={(e) => {
              if (e.target.value === '__upload__') {
                openUploader();
              } else if (e.target.value !== '__user__') {
                setDataset(e.target.value);
              }
            }}
            aria-label="데이터셋 선택"
          >
            {datasetList.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
            {userDataset && <option value="__user__">📤 {userDataset.name}</option>}
            <option value="__upload__">⬆ 데이터 업로드...</option>
          </select>
        </div>
      </header>

      {/* BODY */}
      <div className="if-body">
        <main className="if-main">
          {/* 시나리오 */}
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
          <div className="if-scenario-desc">
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
                {heroLabel} — <span style={{ color: heroGrade.color }}>{heroGrade.label}</span>
              </div>
              <div className="if-hero__message">{heroMessage}</div>
              <div className="if-hero__meta">
                {bundle?.id || bundleId} · {rawDataset.name} · 시나리오: {scenario.label}
                · 데이터 품질 {metrics.data_quality_score}점
              </div>
            </div>
          </section>

          {/* KPI */}
          <SectionLabel
            title="핵심 지표"
            rule={`metric-rules.md → viz-rules.md (${visibleKpis.length}개 KPI)`}
          />
          <div className="if-kpi-grid">
            {visibleKpis.map(def => (
              <KpiCard
                key={def.id}
                label={def.label}
                value={metrics[def.id]}
                format={def.format}
                metricId={def.id}
                isCustom={def.isCustom}
              />
            ))}
          </div>

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
    </div>
  );
}

function SectionLabel({ title, rule }) {
  return (
    <div className="if-section-label">
      <span>{title}</span>
      <span className="if-section-label__rule">⚙ {rule}</span>
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
