// src/hooks/use-onboarding-store.ts
import { create } from 'zustand';

interface OnboardingState {
  formData: Record<string, unknown>;
  updateFormData: (data: Record<string, unknown>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  formData: {},
  updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  reset: () => set({ formData: {} }),
}));