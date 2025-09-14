// src/hooks/use-transformed-data-store.ts
import { create } from 'zustand';

interface TransformedDataState {
  prefilledData: any | null;
  setPrefilledData: (data: any) => void;
  clearPrefilledData: () => void;
}

export const useTransformedDataStore = create<TransformedDataState>((set) => ({
  prefilledData: null,
  setPrefilledData: (data) => set({ prefilledData: data }),
  clearPrefilledData: () => set({ prefilledData: null }),
}));