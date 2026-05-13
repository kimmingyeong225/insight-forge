import { create } from 'zustand';
import { loadBundle } from '../core/parser.js';
import { buildUserDataset, buildLiveDataset } from '../core/datasets.js';

const INSPECTOR_LS_KEY = 'if.inspector.open';
const SCENARIO_HINT_LS_KEY = 'if.scenarioHint.dismissed';
const ONBOARDED_LS_KEY = 'if.onboarded';

function readLs(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage.getItem(key); }
  catch { return fallback; }
}
function writeLs(key, value) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); }
  catch { /* ignore */ }
}
function readInspectorPref() { return readLs(INSPECTOR_LS_KEY, '0') === '1'; }
function writeInspectorPref(open) { writeLs(INSPECTOR_LS_KEY, open ? '1' : '0'); }

export const useStore = create((set, get) => ({
  bundleId: 'insight-forge-default',
  datasetId: 'balanced',
  scenarioId: 'personal_default',
  bundle: null,
  isLoading: false,

  // Skills.md Inspector 토글 (기본 닫힘, localStorage에 영속화)
  isInspectorOpen: readInspectorPref(),
  toggleInspector: () => {
    const next = !get().isInspectorOpen;
    writeInspectorPref(next);
    set({ isInspectorOpen: next });
  },
  closeInspector: () => {
    writeInspectorPref(false);
    set({ isInspectorOpen: false });
  },

  // 시나리오 한 줄 힌트 닫음 상태
  isScenarioHintDismissed: readLs(SCENARIO_HINT_LS_KEY, '0') === '1',
  dismissScenarioHint: () => {
    writeLs(SCENARIO_HINT_LS_KEY, '1');
    set({ isScenarioHintDismissed: true });
  },

  // 온보딩 모달 (기본 한 번도 본 적 없으면 표시)
  isOnboardingOpen: readLs(ONBOARDED_LS_KEY, null) !== '1',
  closeOnboarding: (remember = true) => {
    if (remember) writeLs(ONBOARDED_LS_KEY, '1');
    set({ isOnboardingOpen: false });
  },
  openOnboarding: () => set({ isOnboardingOpen: true }),

  // 사용자 업로드 데이터
  userDataset: null,
  isUploaderOpen: false,

  // 실시간 모드
  isLiveMode: false,
  isLiveLoading: false,
  liveError: null,
  liveHoldings: [],   // [{symbol, weight}] — 사용자가 추가한 종목 목록
  isLiveInputCollapsed: false,  // 분석 시작 후 입력 영역 자동 접힘

  setBundle: async (bundleId) => {
    set({ bundleId, isLoading: true });
    const bundle = await loadBundle(bundleId);
    const defaultScenario = bundleId === 'insight-forge-crypto' ? 'crypto_default' : 'personal_default';
    // 번들 바뀌면 사용자 데이터 리셋 + 시나리오 리셋
    set({ bundle, scenarioId: defaultScenario, datasetId: 'balanced', userDataset: null, isLoading: false });
  },

  setDataset: (datasetId) => set({ datasetId, userDataset: null }),
  setScenario: (scenarioId) => set({ scenarioId }),

  // 업로더
  openUploader: () => set({ isUploaderOpen: true }),
  closeUploader: () => set({ isUploaderOpen: false }),

  applyUserData: (rawHoldings) => {
    const { bundleId } = get();
    const dataset = buildUserDataset(rawHoldings, bundleId);
    set({
      userDataset: dataset,
      datasetId: '__user__',  // 특수 식별자
      isUploaderOpen: false,
    });
  },

  clearUserData: () => set({ userDataset: null, datasetId: 'balanced' }),

  // 실시간 모드 토글
  toggleLiveMode: () => {
    const { isLiveMode } = get();
    set({ isLiveMode: !isLiveMode, liveError: null, isLiveInputCollapsed: false });
    if (isLiveMode) {
      // 더미 모드로 복귀 시 live 데이터 지우기
      set({ userDataset: null, datasetId: 'balanced', liveHoldings: [] });
    }
  },

  // 입력 영역 접힘 토글 (분석 시작 후 결과 영역 강조)
  toggleLiveInputCollapsed: () =>
    set((s) => ({ isLiveInputCollapsed: !s.isLiveInputCollapsed })),
  expandLiveInput: () => set({ isLiveInputCollapsed: false }),

  // 빠른 시작 — 추천 포트폴리오로 즉시 채움
  quickStartPortfolio: async () => {
    const { addLiveHolding, updateLiveHoldingWeight } = get();
    // 삼성전자 60% + SK하이닉스 40%
    await addLiveHolding('삼성전자');
    await addLiveHolding('SK하이닉스');
    updateLiveHoldingWeight('삼성전자', 0.6);
    updateLiveHoldingWeight('SK하이닉스', 0.4);
  },

  // 실시간 종목 추가
  addLiveHolding: async (symbol) => {
    const { liveHoldings } = get();
    if (liveHoldings.find(h => h.symbol === symbol)) return;
    
    // 임시 추가 (로딩 상태 표시용)
    const newHolding = { symbol, weight: 0, price: '불러오는 중...' };
    set({ liveHoldings: [...liveHoldings, newHolding] });

    try {
      const { fetchRealSeries } = await import('../core/datasets.js');
      const { getYahooSymbol } = await import('../core/symbolMap.js');
      const apiSymbol = getYahooSymbol(symbol);
      const res = await fetchRealSeries(apiSymbol);
      if (res.success && res.series?.length > 0) {
        const lastPrice = res.series[res.series.length - 1].close;
        // API 심볼 패턴으로 통화 분류: '/' 포함=크립토 USD, 숫자만=KR 주식 KRW, 그 외=US 주식 USD
        const currency = apiSymbol.includes('/') ? 'USD'
                       : /^\d+$/.test(apiSymbol) ? 'KRW'
                       : 'USD';
        const locale = currency === 'KRW' ? 'ko-KR' : 'en-US';
        const fractionDigits = currency === 'KRW' ? 0 : 2;
        const formattedPrice = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        }).format(lastPrice);

        set(state => ({
          liveHoldings: state.liveHoldings.map(h =>
            h.symbol === symbol ? { ...h, price: formattedPrice } : h
          )
        }));
      } else {
        set(state => ({
          liveHoldings: state.liveHoldings.map(h => 
            h.symbol === symbol ? { ...h, price: '가격 정보 없음' } : h
          )
        }));
      }
    } catch {
      set(state => ({
        liveHoldings: state.liveHoldings.map(h => 
          h.symbol === symbol ? { ...h, price: '연결 실패' } : h
        )
      }));
    }
  },

  updateLiveHoldingWeight: (symbol, weight) => {
    const { liveHoldings } = get();
    const updated = liveHoldings.map(h => 
      h.symbol === symbol ? { ...h, weight: parseFloat(weight) || 0 } : h
    );
    set({ liveHoldings: updated });
  },

  removeLiveHolding: (symbol) => {
    const { liveHoldings } = get();
    set({ liveHoldings: liveHoldings.filter(h => h.symbol !== symbol) });
  },

  // Yahoo Finance 호출 → live 데이터셋 생성
  applyLiveData: async () => {
    const { liveHoldings } = get();
    if (liveHoldings.length === 0) return;
    set({ isLiveLoading: true, liveError: null });
    try {
      const dataset = await buildLiveDataset(liveHoldings);
      // 분석 성공 시 입력 영역 자동 접힘 → 결과 영역 강조
      set({ userDataset: dataset, datasetId: '__live__', isLiveLoading: false, isLiveInputCollapsed: true });
    } catch (e) {
      set({ liveError: e.message, isLiveLoading: false });
    }
  },

  init: async () => {
    const { bundleId } = get();
    set({ isLoading: true });
    const bundle = await loadBundle(bundleId);
    set({ bundle, isLoading: false });
  },
}));
