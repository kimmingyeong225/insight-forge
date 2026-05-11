import { create } from 'zustand';
import { loadBundle } from '../core/parser.js';
import { buildUserDataset, buildLiveDataset } from '../core/datasets.js';

export const useStore = create((set, get) => ({
  bundleId: 'insight-forge-default',
  datasetId: 'balanced',
  scenarioId: 'personal_default',
  bundle: null,
  isLoading: false,

  // 사용자 업로드 데이터
  userDataset: null,
  isUploaderOpen: false,

  // 실시간 모드
  isLiveMode: false,
  isLiveLoading: false,
  liveError: null,
  liveHoldings: [],   // [{symbol, weight}] — 사용자가 추가한 종목 목록

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
    set({ isLiveMode: !isLiveMode, liveError: null });
    if (isLiveMode) {
      // 더미 모드로 복귀 시 live 데이터 지우기
      set({ userDataset: null, datasetId: 'balanced', liveHoldings: [] });
    }
  },

  // 실시간 종목 추가
  addLiveHolding: (symbol) => {
    const { liveHoldings } = get();
    if (liveHoldings.find(h => h.symbol === symbol)) return;
    set({ liveHoldings: [...liveHoldings, { symbol, weight: 0 }] });
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
      set({ userDataset: dataset, datasetId: '__live__', isLiveLoading: false });
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
