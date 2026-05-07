import { create } from 'zustand';
import { loadBundle } from '../core/parser.js';
import { buildUserDataset } from '../core/datasets.js';

export const useStore = create((set, get) => ({
  bundleId: 'insight-forge-default',
  datasetId: 'balanced',
  scenarioId: 'personal_default',
  bundle: null,
  isLoading: false,

  // 사용자 업로드 데이터
  userDataset: null,        // 업로드된 데이터셋 객체
  isUploaderOpen: false,

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

  init: async () => {
    const { bundleId } = get();
    set({ isLoading: true });
    const bundle = await loadBundle(bundleId);
    set({ bundle, isLoading: false });
  },
}));
